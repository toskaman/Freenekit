import express from 'express';
import cors from 'cors';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// ─────────────────────────────────────────────────
//  Config persistée (dossier APPDATA/freenekit-windows ou local)
// ─────────────────────────────────────────────────
const appDataFolder = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'freenekit-windows')
  : path.join('.', 'freenekit-windows');

if (!fs.existsSync(appDataFolder)) {
  try { fs.mkdirSync(appDataFolder, { recursive: true }); } catch (e) {}
}

const CONFIG_FILE = path.join(appDataFolder, 'freenekit_config.json');

let appConfig = {
  appId:          'fr.freebox.freenekit.windows',
  appName:        'Freenekit Windows',
  appVersion:     '1.0.0',
  deviceName:     'PC Windows',
  appToken:       null,
  sessionToken:   null,
  freeboxHost:    'mafreebox.freebox.fr',
  freeboxApiBase: '/api/',
  freeboxApiVer:  'v8',
  freeboxModel:   'Freebox',
  knownMacs:      [],
  userSettings:   {
    enableWifiAnalysis: true,
    enableNewDeviceAlert: true,
    enableOverloadAlert: true,
    enableSystrayWidget: true,
    themeMode: 'system',
    highPingThreshold: 80,
    overloadPctThreshold: 95
  }
};

function cleanToken(t) {
  if (!t) return null;
  return (t + '').trim().replace(/ /g, '+');
}

function stringHash(str) {
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

if (fs.existsSync(CONFIG_FILE)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (parsed.appToken)      appConfig.appToken      = cleanToken(parsed.appToken);
    if (parsed.freeboxHost)   appConfig.freeboxHost   = parsed.freeboxHost;
    if (parsed.freeboxApiVer) appConfig.freeboxApiVer = parsed.freeboxApiVer;
    if (parsed.knownMacs)     appConfig.knownMacs     = parsed.knownMacs;
    if (parsed.userSettings)  appConfig.userSettings  = { ...appConfig.userSettings, ...parsed.userSettings };
  } catch (e) { console.warn('[Freenekit Server] Lecture config échouée:', e.message); }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({
      appToken:      appConfig.appToken,
      freeboxHost:   appConfig.freeboxHost,
      freeboxApiVer: appConfig.freeboxApiVer,
      knownMacs:     appConfig.knownMacs,
      userSettings:  appConfig.userSettings,
    }), 'utf8');
  } catch (e) {}
}

// ─────────────────────────────────────────────────
//  Découverte automatique de la Freebox
// ─────────────────────────────────────────────────
const DISCOVERY_HOSTS = [
  'mafreebox.freebox.fr',
  '192.168.1.254',
  '192.168.0.254',
  '192.168.1.1',
  'freebox.home',
];

function probeHost(hostname) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname, port: 80, path: '/api_version', method: 'GET', timeout: 4000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.api_version) return resolve(null);
          resolve(json);
        } catch { resolve(null); }
      });
    });
    req.on('error',   () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function discoverFreebox() {
  console.log('[Freenekit Server] Recherche de la Freebox sur le réseau...');
  for (const host of DISCOVERY_HOSTS) {
    const info = await probeHost(host);
    if (info) {
      const major = parseInt((info.api_version || '8').split('.')[0]);
      appConfig.freeboxHost   = host;
      appConfig.freeboxApiVer = `v${major}`;
      appConfig.freeboxModel  = info.box_model_name || info.device_name || 'Freebox';
      console.log(`[Freenekit Server] ✅ Freebox trouvée sur ${host} — ${appConfig.freeboxModel} | API ${appConfig.freeboxApiVer}`);
      saveConfig();
      return true;
    }
  }
  console.warn('[Freenekit Server] ⚠️ Aucune Freebox trouvée.');
  return false;
}

// ─────────────────────────────────────────────────
//  HTTP vers Freebox OS
// ─────────────────────────────────────────────────
function freeboxFetch(apiPath, options = {}) {
  return new Promise((resolve) => {
    const fullPath = `${appConfig.freeboxApiBase}${appConfig.freeboxApiVer}${apiPath}`;
    const reqOpts  = {
      hostname: appConfig.freeboxHost,
      port:     80,
      path:     fullPath,
      method:   options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(appConfig.sessionToken ? { 'X-Fbx-App-Auth': appConfig.sessionToken } : {}),
        ...(options.headers || {}),
      },
      timeout: 8000,
    };
    const req = http.request(reqOpts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) {
          resolve({ success: false, error: 'json_parse', raw: data.slice(0, 120) });
        }
      });
    });
    req.on('error',   (e) => resolve({ success: false, error: e.message }));
    req.on('timeout', ()  => { req.destroy(); resolve({ success: false, error: 'timeout' }); });
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

// ─────────────────────────────────────────────────
//  Authentification & session
// ─────────────────────────────────────────────────
let sessionExpiry = 0;
let sessionPermissions = {};
let lastDeviceStats = {}; // { [id]: { tx_bytes, rx_bytes, time, peakDown } }
let authPromise = null;

async function authenticateSession(force = false) {
  if (!appConfig.appToken) return false;

  if (!force && appConfig.sessionToken && Date.now() < sessionExpiry) return true;
  if (authPromise) return authPromise;

  authPromise = (async () => {
    try {
      appConfig.sessionToken = null;
      const loginRes = await freeboxFetch('/login/');
      if (!loginRes?.success || !loginRes?.result?.challenge) {
        console.warn('[Freenekit Server] /login/ échoué:', JSON.stringify(loginRes));
        return false;
      }

      const password = crypto.createHmac('sha1', appConfig.appToken)
                             .update(loginRes.result.challenge).digest('hex');
      const sessionRes = await freeboxFetch('/login/session/', {
        method: 'POST',
        body: { app_id: appConfig.appId, app_version: appConfig.appVersion, password }
      });

      if (sessionRes?.success && sessionRes?.result?.session_token) {
        appConfig.sessionToken = sessionRes.result.session_token;
        sessionPermissions = sessionRes.result.permissions || {};
        sessionExpiry = Date.now() + 55 * 60 * 1000;
        console.log('[Freenekit Server] Session ouverte. Permissions:', JSON.stringify(sessionPermissions));
        return true;
      }

      console.warn('[Freenekit Server] Session échouée:', JSON.stringify(sessionRes));
      return false;
    } catch (e) {
      console.warn('[Freenekit Server] Error in authenticateSession:', e.message);
      return false;
    } finally {
      authPromise = null;
    }
  })();

  return authPromise;
}

// ─────────────────────────────────────────────────
//  Applications réseau Windows
// ─────────────────────────────────────────────────
async function getRealNetworkApps() {
  return new Promise((resolve) => {
    const NAMES = {
      chrome: 'Google Chrome', firefox: 'Mozilla Firefox', msedge: 'Microsoft Edge',
      opera: 'Opera', brave: 'Brave', spotify: 'Spotify', steam: 'Steam',
      discord: 'Discord', discordcanary: 'Discord Canary', teams: 'Microsoft Teams',
      slack: 'Slack', zoom: 'Zoom', onedrive: 'OneDrive', dropbox: 'Dropbox',
      skype: 'Skype', outlook: 'Outlook', thunderbird: 'Thunderbird', vlc: 'VLC',
      obs64: 'OBS Studio', obs32: 'OBS Studio', svchost: 'Services Windows',
      lsass: 'Sécurité Windows', explorer: 'Explorateur Windows', searchapp: 'Windows Search',
      runtimebroker: 'Runtime Broker', powershell: 'PowerShell', pwsh: 'PowerShell 7',
      wsl: 'WSL', epicgameslauncher: 'Epic Games', battlenet: 'Battle.net',
      upc: 'Ubisoft Connect', qbittorrent: 'qBittorrent', utorrent: 'µTorrent',
      plex: 'Plex Media Server', whatsapp: 'WhatsApp', telegram: 'Telegram',
      robloxplayerbeta: 'Roblox Game', thorium: 'Thorium Browser', tailscaled: 'Tailscale VPN',
      lghub_agent: 'Logitech G HUB', parsecd: 'Parsec', code: 'VS Code'
    };

    const psScript = `
      $conns = Get-NetTCPConnection -ErrorAction SilentlyContinue
      $procs = $conns | Where-Object { $_.OwningProcess -gt 0 } | ForEach-Object {
          try { (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName } catch {}
      } | Where-Object { $_ }
      $procs | Group-Object | Sort-Object Count -Descending | Select-Object -First 20 | ForEach-Object {
          [PSCustomObject]@{ Name = $_.Name; Connections = $_.Count }
      } | ConvertTo-Json -Compress
    `;

    const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
    execPromise(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64}`, { timeout: 8000 })
      .then(({ stdout }) => {
        if (!stdout?.trim()) return resolve([]);
        const raw = stdout.trim();
        const start = raw.indexOf('[') !== -1 ? raw.indexOf('[') : raw.indexOf('{');
        const end = raw.lastIndexOf(']') !== -1 ? raw.lastIndexOf(']') : raw.lastIndexOf('}');
        if (start === -1) return resolve([]);

        const parsed = JSON.parse(raw.slice(start, end + 1));
        const list = Array.isArray(parsed) ? parsed : [parsed];

        const result = list.filter(p => p?.Name).map((p, i) => {
          const cleanName = (p.Name || '').trim();
          const key = cleanName.toLowerCase();
          const displayName = NAMES[key] || (cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
          return {
            pid: i + 1,
            name: `${cleanName}.exe`,
            displayName,
            down: 0,
            up: 0,
            connections: parseInt(p.Connections) || 0,
          };
        });
        resolve(result);
      })
      .catch((err) => {
        console.warn('[Freenekit Server] getRealNetworkApps:', err.message);
        resolve([]);
      });
  });
}

// ─────────────────────────────────────────────────
//  Self-test complet
// ─────────────────────────────────────────────────
async function runSelfTest() {
  const results = {};
  const info = await probeHost(appConfig.freeboxHost);
  results.discovery = info ? { ok: true, model: info.box_model_name, apiVer: info.api_version, host: appConfig.freeboxHost } : { ok: false };

  results.auth = { ok: false };
  if (appConfig.appToken) {
    const ok = await authenticateSession(true);
    results.auth = { ok, permissions: sessionPermissions };
  } else { results.auth.reason = 'no_token'; }

  results.connection = { ok: false };
  if (results.auth.ok) {
    const r = await freeboxFetch('/connection/');
    if (r?.success && r?.result) {
      results.connection = {
        ok: true, state: r.result.state, media: r.result.media,
        rateDown: Math.round((r.result.rate_down || 0) / 125000 * 100) / 100,
        rateUp:   Math.round((r.result.rate_up   || 0) / 125000 * 100) / 100,
        bandDown: Math.round((r.result.bandwidth_down || 0) / 1000000),
        bandUp:   Math.round((r.result.bandwidth_up   || 0) / 1000000),
        ipv4:     r.result.ipv4,
      };
    } else { results.connection.error = r?.error_code || r?.error; }
  }

  results.lan = { ok: false };
  if (results.auth.ok) {
    const r = await freeboxFetch('/lan/browser/pub/');
    if (r?.success && Array.isArray(r.result)) {
      results.lan = { ok: true, total: r.result.length, connected: r.result.filter(d => d.reachable || d.active).length };
    } else { results.lan.error = r?.error_code || r?.error; }
  }

  results.system = { ok: false };
  if (results.auth.ok) {
    const r = await freeboxFetch('/system/');
    if (r?.success && r?.result) {
      results.system = { ok: true, model: r.result.model_name, firmware: r.result.firmware_version, uptime: r.result.uptime_val };
    } else { results.system.error = r?.error_code || r?.error; }
  }

  return results;
}

// ─────────────────────────────────────────────────
//  Routes API Express
// ─────────────────────────────────────────────────
app.get('/api/freebox/settings', (req, res) => {
  res.json(appConfig.userSettings || {});
});

app.post('/api/freebox/settings', (req, res) => {
  appConfig.userSettings = { ...(appConfig.userSettings || {}), ...(req.body || {}) };
  saveConfig();
  res.json({ success: true, settings: appConfig.userSettings });
});

app.post('/api/freebox/reboot', async (req, res) => {
  const isAuth = await authenticateSession();
  if (!isAuth) return res.status(401).json({ success: false, error: 'Non authentifié' });
  const r = await freeboxFetch('/system/reboot/', { method: 'POST' });
  if (r?.success) {
    res.json({ success: true });
  } else {
    res.json({ success: false, error: r?.error_code || 'Erreur redémarrage' });
  }
});

// ── Redirection de ports (NAT) ──
app.get('/api/freebox/ports', async (req, res) => {
  const isAuth = await authenticateSession();
  if (!isAuth) return res.status(401).json({ success: false, error: 'Non authentifié' });
  const r = await freeboxFetch('/fw/redir/');
  if (r?.success && Array.isArray(r.result)) {
    res.json({ success: true, rules: r.result });
  } else {
    res.json({ success: false, error: r?.error_code || 'Impossible de lire les règles NAT' });
  }
});

app.post('/api/freebox/ports/add', async (req, res) => {
  const isAuth = await authenticateSession();
  if (!isAuth) return res.status(401).json({ success: false, error: 'Non authentifié' });
  const r = await freeboxFetch('/fw/redir/', { method: 'POST', body: req.body });
  if (r?.success) {
    res.json({ success: true, rule: r.result });
  } else {
    res.json({ success: false, error: r?.error_code || r?.msg || 'Erreur création règle NAT' });
  }
});

app.delete('/api/freebox/ports/:id', async (req, res) => {
  const isAuth = await authenticateSession();
  if (!isAuth) return res.status(401).json({ success: false, error: 'Non authentifié' });
  const { id } = req.params;
  const r = await freeboxFetch(`/fw/redir/${id}`, { method: 'DELETE' });
  if (r?.success) {
    res.json({ success: true });
  } else {
    res.json({ success: false, error: r?.error_code || 'Erreur suppression règle NAT' });
  }
});

// ── Journal des Appels Fixes ──
app.get('/api/freebox/calls', async (req, res) => {
  const isAuth = await authenticateSession();
  if (!isAuth) return res.status(401).json({ success: false, error: 'Non authentifié' });
  const r = await freeboxFetch('/call/log/');
  if (r?.success && Array.isArray(r.result)) {
    res.json({ success: true, calls: r.result });
  } else {
    res.json({ success: false, error: r?.error_code || 'Impossible de lire le journal d\'appels' });
  }
});

app.post('/api/freebox/pair/save', async (req, res) => {
  const { appToken } = req.body || {};
  if (!appToken) return res.status(400).json({ error: 'appToken manquant' });
  appConfig.appToken = cleanToken(appToken);
  saveConfig();
  const ok = await authenticateSession(true);
  res.json({ success: true, sessionActive: ok });
});

app.post('/api/freebox/pair/request', async (req, res) => {
  const r = await freeboxFetch('/login/authorize/', {
    method: 'POST',
    body: {
      app_id:      appConfig.appId,
      app_name:    appConfig.appName,
      app_version: appConfig.appVersion,
      device_name: appConfig.deviceName,
    }
  });
  if (r?.success && r?.result) {
    res.json({ success: true, trackId: r.result.track_id, appToken: cleanToken(r.result.app_token) });
  } else {
    res.json({ success: false, error: 'Impossible de joindre ' + appConfig.freeboxHost, raw: r });
  }
});

app.get('/api/freebox/pair/status/:trackId', async (req, res) => {
  const { trackId } = req.params;
  const rawToken = req.query.appToken || req.body?.appToken;
  const r = await freeboxFetch(`/login/authorize/${trackId}`);
  if (r?.success && r?.result) {
    const status = r.result.status;
    if (status === 'granted' && rawToken) {
      appConfig.appToken = cleanToken(rawToken);
      saveConfig();
      await authenticateSession(true);
    }
    res.json({ status });
  } else {
    res.json({ status: 'pending' });
  }
});

app.get('/api/freebox/selftest', async (req, res) => {
  const results = await runSelfTest();
  res.json(results);
});

app.get('/api/freebox/debug', async (req, res) => {
  const isAuth = await authenticateSession();
  res.json({
    host:        appConfig.freeboxHost,
    apiVer:      appConfig.freeboxApiVer,
    model:       appConfig.freeboxModel,
    hasToken:    !!appConfig.appToken,
    hasSession:  !!appConfig.sessionToken,
    authOk:      isAuth,
    permissions: sessionPermissions,
    login:       await freeboxFetch('/login/'),
    connection:  await freeboxFetch('/connection/'),
    lan:         await freeboxFetch('/lan/browser/pub/'),
    system:      await freeboxFetch('/system/'),
  });
});

app.get('/api/freebox/devices', async (req, res) => {
  const isAuth      = await authenticateSession();
  const networkApps = await getRealNetworkApps();

  const base = {
    totalDownloadMbit: 0,
    totalUploadMbit:   0,
    maxDownloadMbit:   1000,
    maxUploadMbit:     700,
    devices:           [],
    networkApps,
    isRealData:        true,
    isPaired:          !!appConfig.appToken,
    apiVer:            appConfig.freeboxApiVer,
    model:             appConfig.freeboxModel,
    permissions:       sessionPermissions,
    authOk:            isAuth,
    errors:            [],
    permissionError:   false,
  };

  if (!isAuth) {
    base.errors.push('auth_failed');
    return res.json(base);
  }

  const connRes = await freeboxFetch('/connection/');
  if (connRes?.success && connRes?.result) {
    const r = connRes.result;
    base.totalDownloadMbit = Math.round((r.rate_down      || 0) / 125000 * 10) / 10;
    base.totalUploadMbit   = Math.round((r.rate_up        || 0) / 125000 * 10) / 10;
    base.maxDownloadMbit   = Math.max(1, Math.round((r.bandwidth_down || 0) / 125000));
    base.maxUploadMbit     = Math.max(1, Math.round((r.bandwidth_up   || 0) / 125000));
    base.connectionState   = r.state;
    base.ipv4              = r.ipv4;
  } else {
    const code = connRes?.error_code || connRes?.error || 'unknown';
    base.errors.push(`connection_failed:${code}`);
    if (code === 'insufficient_rights') base.permissionError = true;
  }

  const lanRes = await freeboxFetch('/lan/browser/pub/');
  const now = Date.now();

  if (lanRes?.success && Array.isArray(lanRes.result)) {
    const all = lanRes.result;

    // 1. Calcul des deltas bruts par équipement à partir des compteurs Freebox
    const rawDevices = all.map((d, i) => {
      const connected = !!(d.reachable || d.active);
      const isWifi    = d.access_point?.connectivity_type === 'wifi';
      const band      = d.access_point?.band ? ` ${d.access_point.band}` : '';
      const connType  = isWifi ? `Wi-Fi${band}` : 'Filaire';
      const isLocal   = d.is_local || false;

      const ipv4Obj = (d.l3connectivities || []).find(c => c.af === 'ipv4' && c.addr);
      const ipAddr  = ipv4Obj ? ipv4Obj.addr : '';

      let name = d.primary_name || d.hostname || '';
      if (!name && Array.isArray(d.names) && d.names.length > 0) name = d.names[0].name || '';
      if (!name) name = d.l2ident?.id || `Appareil #${i + 1}`;

      const mac = d.l2ident?.id || '';

      let devDown = 0;
      let devUp   = 0;
      const ap    = d.access_point;

      if (ap && ap.tx_bytes !== undefined && ap.rx_bytes !== undefined) {
        const prev = lastDeviceStats[d.id];
        if (prev && prev.time) {
          const dt = (now - prev.time) / 1000;
          if (dt > 0.4 && dt < 30) {
            const dTx = Math.max(0, ap.tx_bytes - prev.tx_bytes);
            const dRx = Math.max(0, ap.rx_bytes - prev.rx_bytes);
            devDown = (dTx / dt / 125000);
            devUp   = (dRx / dt / 125000);
          }
        }

        lastDeviceStats[d.id] = {
          tx_bytes: ap.tx_bytes,
          rx_bytes: ap.rx_bytes,
          time:     now,
          peakDown: Math.max(lastDeviceStats[d.id]?.peakDown || 0, devDown),
        };
      }

      return {
        id:        d.id || `host-${i}`,
        name,
        mac,
        ip:        ipAddr,
        icon:      d.host_type || (isLocal ? 'laptop' : 'smartphone'),
        host_type: d.host_type,
        apMac:     ap?.mac || 'none',
        type:      connType,
        active:    connected,
        reachable: !!d.reachable,
        sending:   !!d.active,
        isLocal,
        rawDown:   connected ? devDown : 0,
        rawUp:     connected ? devUp : 0,
      };
    });

    // 2. Regroupement par AP (pour sous-routeurs/switches partagés)
    const apGroups = {};
    rawDevices.forEach(dev => {
      const key = `${dev.apMac}_${Math.round(dev.rawDown * 100)}_${Math.round(dev.rawUp * 100)}`;
      if (!apGroups[key]) apGroups[key] = [];
      apGroups[key].push(dev);
    });

    // 3. Détection de nouveaux appareils inconnus
    const newlyDiscovered = [];
    const isFirstScan = (appConfig.knownMacs || []).length === 0;

    rawDevices.forEach(d => {
      if (d.mac && d.mac.length > 5) {
        const upperMac = d.mac.toUpperCase();
        if (!appConfig.knownMacs.includes(upperMac)) {
          appConfig.knownMacs.push(upperMac);
          if (!isFirstScan) {
            newlyDiscovered.push(d);
          }
        }
      }
    });

    if (newlyDiscovered.length > 0) {
      saveConfig();
    }

    base.newDevicesCount = newlyDiscovered.length;

    base.devices = rawDevices.map(dev => {
      const key   = `${dev.apMac}_${Math.round(dev.rawDown * 100)}_${Math.round(dev.rawUp * 100)}`;
      const group = apGroups[key];

      let finalDown = dev.rawDown;
      let finalUp   = dev.rawUp;

      if (group && group.length > 1 && dev.rawDown > 0) {
        let totalWeight = 0;
        const weights = group.map(g => {
          let w = 1.0;
          if (g.isLocal || g.host_type === 'workstation' || g.host_type === 'laptop') w *= 2.5;
          if (g.sending) w *= 1.8;
          w += (stringHash(g.id) % 50) / 100;
          totalWeight += w;
          return w;
        });
        const idx = group.findIndex(g => g.id === dev.id);
        const share = weights[idx] / totalWeight;
        finalDown = dev.rawDown * share;
        finalUp   = dev.rawUp * share;
      }

        const downMbit = Math.round(finalDown * 10) / 10;
        const upMbit   = Math.round(finalUp   * 10) / 10;
        const isSending = !!(dev.sending || downMbit > 0.05 || upMbit > 0.05);

        // Peak individuel calculé à partir du débit final propre à l'appareil
        const prevPeak = lastDeviceStats[dev.id]?.peakDown || 0;
        const newPeak = Math.max(prevPeak, finalDown);
        if (lastDeviceStats[dev.id]) {
          lastDeviceStats[dev.id].peakDown = newPeak;
        }
        const peakFormatted = Math.round(Math.max(newPeak, downMbit) * 10) / 10;

        let devProcesses = [];
        let devConn = 0;
        if (dev.isLocal && networkApps.length > 0) {
          const totalCx = networkApps.reduce((sum, a) => sum + (a.connections || 1), 0);
          devConn = totalCx;
          devProcesses = networkApps.map(app => {
            const share = (app.connections || 1) / totalCx;
            return {
              ...app,
              down: Math.round(downMbit * share * 10) / 10,
              up: Math.round(upMbit * share * 10) / 10,
            };
          });
        } else if (dev.active) {
          devConn = (stringHash(dev.id) % 4) + 1;
        }

        return {
          id:          dev.id,
          name:        dev.name,
          mac:         dev.mac,
          ip:          dev.ip,
          icon:        dev.icon,
          type:        dev.type,
          active:      dev.active,
          reachable:   dev.reachable,
          sending:     isSending,
          isLocal:     dev.isLocal,
          connections: devConn,
          processes:   devProcesses,
          down:        downMbit,
          up:          upMbit,
          peakDown:    peakFormatted,
          pctLine:     base.maxDownloadMbit > 0
            ? Math.round((downMbit / base.maxDownloadMbit) * 1000) / 10
            : 0,
        };
    });
  } else {
    const code = lanRes?.error_code || lanRes?.error || 'unknown';
    base.errors.push(`lan_failed:${code}`);
    if (code === 'insufficient_rights' || code === 'auth_required' || code === 'forbidden') {
      base.permissionError = true;
    }
  }

  const localDevice = base.devices.find(d => d.isLocal) || base.devices.find(d => d.active);
  const pcDown = localDevice ? localDevice.down : base.totalDownloadMbit;
  const pcUp   = localDevice ? localDevice.up   : base.totalUploadMbit;
  const totalAppConn = networkApps.reduce((acc, a) => acc + (a.connections || 0), 0) || 1;

  base.networkApps = networkApps.map(app => {
    const share = (app.connections || 0) / totalAppConn;
    return {
      ...app,
      down: Math.round(pcDown * share * 10) / 10,
      up:   Math.round(pcUp   * share * 10) / 10,
    };
  });

  return res.json(base);
});

(async () => {
  await discoverFreebox();
  if (appConfig.appToken) await authenticateSession(true);
  app.listen(PORT, () => console.log(`[Freenekit Server] Serveur écoutant sur http://localhost:${PORT}`));
})();
