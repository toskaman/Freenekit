import React, { useState, useEffect, useRef } from 'react';
import {
  Tv, Laptop, Gamepad2, Smartphone, Tablet, Wifi, Speaker, Camera, Cast, Cpu, Printer,
  ChevronDown, ChevronRight, Activity, Globe, WifiOff, Monitor
} from 'lucide-react';

/* ── Sparkline canvas ─────────────────────────────────────── */
function SparklineCanvas({ history = [], color = '#2563eb' }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cssW = 90;
    const cssH = 24;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, cssW, cssH);
    if (!history || history.length < 2) return;

    const max = Math.max(...history, 0.01);
    const step = cssW / (history.length - 1);

    const points = history.map((val, idx) => ({
      x: idx * step,
      y: cssH - (val / max) * (cssH - 6) - 3
    }));

    // Draw gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, cssH);
    grad.addColorStop(0, color.startsWith('#') ? `${color}33` : 'rgba(37,99,235,0.2)');
    grad.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(cssW, cssH);
    ctx.lineTo(0, cssH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw stroke line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // End point indicator
    const lastP = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(lastP.x, lastP.y, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }, [history, color]);

  return <canvas ref={canvasRef} style={{ width: 90, height: 24, display: 'block' }} />;
}

/* ── Formatters ───────────────────────────────────────────── */
function fmt(mbit) {
  if (!mbit || mbit <= 0) return '—';
  if (mbit >= 1) return `${mbit.toFixed(1)} Mb/s`;
  const k = Math.round(mbit * 1000);
  return k > 0 ? `${k} kb/s` : '—';
}

/* ── Device icon ──────────────────────────────────────────── */
const ICON_MAP = {
  tv: <Tv size={15} />, television: <Tv size={15} />,
  laptop: <Laptop size={15} />, workstation: <Laptop size={15} />,
  freebox_player: <Monitor size={15} />, freebox_server: <Monitor size={15} />,
  gamepad: <Gamepad2 size={15} />, gaming_console: <Gamepad2 size={15} />,
  smartphone: <Smartphone size={15} />, phone: <Smartphone size={15} />,
  tablet: <Tablet size={15} />,
  router: <Wifi size={15} />, nas: <Cpu size={15} />,
  speaker: <Speaker size={15} />, multimedia: <Speaker size={15} />,
  camera: <Camera size={15} />, ip_camera: <Camera size={15} />,
  cast: <Cast size={15} />, printer: <Printer size={15} />,
};
const DevIcon = ({ type }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 8,
    background: 'rgba(37,99,235,0.1)', color: '#2563eb', flexShrink: 0
  }}>
    {ICON_MAP[type] || <Laptop size={15} />}
  </span>
);

/* ── Section header ───────────────────────────────────────── */
function SectionHeader({ icon, label, count, color, expanded, onToggle, dimmed }) {
  return (
    <tr>
      <td colSpan={7} style={{ padding: 0 }}>
        <button
          onClick={onToggle}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', background: dimmed ? 'rgba(100,116,139,0.06)' : 'rgba(37,99,235,0.06)',
            border: 'none', borderTop: '1px solid var(--border-light)',
            color: dimmed ? 'var(--text-muted)' : color, cursor: 'pointer',
            fontWeight: 600, fontSize: 12, letterSpacing: 0.3, textTransform: 'uppercase'
          }}
        >
          {icon}
          {label}
          <span style={{
            background: dimmed ? 'rgba(100,116,139,0.15)' : `${color}22`,
            color: dimmed ? '#94a3b8' : color,
            borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700
          }}>{count}</span>
          <span style={{ marginLeft: 'auto' }}>
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
        </button>
      </td>
    </tr>
  );
}

/* ── App process row ──────────────────────────────────────── */
function AppRow({ proc, history }) {
  return (
    <tr style={{ background: 'rgba(37,99,235,0.02)' }}>
      <td style={{ paddingLeft: 44 }} colSpan={2}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: 6, background: 'rgba(99,102,241,0.1)',
            color: '#6366f1', fontSize: 10, fontWeight: 700, flexShrink: 0
          }}>
            {(proc.displayName || proc.name || '?')[0].toUpperCase()}
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-main)' }}>
            {proc.displayName}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {proc.name} · PID {proc.pid}
          </span>
        </div>
      </td>
      <td>
        <SparklineCanvas history={history || []} color="#6366f1" />
      </td>
      <td style={{ textAlign: 'right', fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
        {fmt(proc.down)}
      </td>
      <td style={{ textAlign: 'right', fontSize: 12, color: '#10b981', fontWeight: 600 }}>
        {fmt(proc.up)}
      </td>
      <td style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
        {proc.connections ? `${proc.connections} cx` : '—'}
      </td>
      <td style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>—</td>
    </tr>
  );
}

/* ── Device row ───────────────────────────────────────────── */
function DeviceRow({ dev, history, inactive, expandedId, setExpandedId, appHistories }) {
  const isExpanded = expandedId === dev.id;
  const hasApps = dev.isLocal && dev.processes && dev.processes.length > 0;

  return (
    <>
      <tr
        className="device-row"
        style={{ opacity: inactive ? 0.55 : 1 }}
        onClick={() => hasApps && setExpandedId(isExpanded ? null : dev.id)}
      >
        <td className="device-name-cell">
          {hasApps && (
            <button className="win-btn" style={{ padding: 2, marginRight: 4 }}>
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          )}
          <DevIcon type={dev.icon} />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {dev.name}
            </span>
            {dev.mac && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {dev.mac}
              </span>
            )}
          </div>
          {dev.isLocal && <span className="local-pc-badge">Ce PC</span>}
        </td>
        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 500 }}>{dev.type}</span>
            {dev.ip && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {dev.ip}
              </span>
            )}
          </div>
        </td>
        <td className="sparkline-cell" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 42 }}>
          {!inactive && (
            <>
              <span
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: dev.sending ? '#10b981' : '#3b82f6',
                  flexShrink: 0,
                  boxShadow: dev.sending ? '0 0 6px #10b981' : 'none'
                }}
                title={dev.sending ? "Actif (envoie/reçoit des données)" : "Connecté (au repos)"}
              />
              <SparklineCanvas history={history} />
            </>
          )}
          {inactive && <span style={{ fontSize: 11, color: '#94a3b8' }}>Hors ligne</span>}
        </td>
        <td className="rate-val blue" style={{ textAlign: 'right' }}>{inactive ? '—' : fmt(dev.down)}</td>
        <td className="rate-val blue" style={{ textAlign: 'right' }}>{inactive ? '—' : fmt(dev.up)}</td>
        <td className="rate-val muted" style={{ textAlign: 'right' }}>
          {inactive ? '—' : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span>{fmt(dev.peakDown)}</span>
              {dev.connections > 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{dev.connections} cx</span>
              )}
            </div>
          )}
        </td>
        <td className="rate-val muted" style={{ textAlign: 'right' }}>
          {inactive ? '—' : `${(dev.pctLine || 0).toFixed(1)} %`}
        </td>
      </tr>

      {/* Sous-processus réseau du PC local */}
      {isExpanded && hasApps && dev.processes.map(proc => (
        <AppRow
          key={proc.pid}
          proc={proc}
          history={appHistories[proc.pid] || []}
        />
      ))}
    </>
  );
}

/* ── Main component ───────────────────────────────────────── */
export default function DeviceTable({ devices = [], networkApps = [] }) {
  const [showInactive, setShowInactive] = useState(true);
  const [showApps, setShowApps] = useState(true);
  const [expandedDeviceId, setExpandedDeviceId] = useState(null);
  const [sparkHistories, setSparkHistories] = useState({});
  const [appHistories, setAppHistories] = useState({});

  // active=true signifie reachable||sending (défini côté serveur)
  const activeDevices   = devices.filter(d => d.active === true);
  const inactiveDevices = devices.filter(d => d.active !== true);

  useEffect(() => {
    setSparkHistories(prev => {
      const u = { ...prev };
      devices.forEach(dev => {
        const h = u[dev.id] ? [...u[dev.id]] : Array(8).fill(0);
        if (h.length >= 20) h.shift();
        h.push(dev.down || 0);
        u[dev.id] = h;
      });
      return u;
    });
  }, [devices]);

  useEffect(() => {
    setAppHistories(prev => {
      const u = { ...prev };
      networkApps.forEach(app => {
        const h = u[app.pid] ? [...u[app.pid]] : Array(8).fill(0);
        if (h.length >= 20) h.shift();
        h.push(app.down || 0);
        u[app.pid] = h;
      });
      return u;
    });
  }, [networkApps]);

  const thStyle = {
    padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid var(--border-light)',
    background: 'var(--bg-app)', whiteSpace: 'nowrap'
  };

  return (
    <div className="table-card" style={{ overflow: 'hidden', borderRadius: 14, border: '1px solid var(--border-light)' }}>
      <table className="device-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '28%', textAlign: 'left' }}>Appareil / Application</th>
            <th style={{ ...thStyle, width: '17%', textAlign: 'left' }}>Connexion</th>
            <th style={{ ...thStyle, width: '14%' }}>Activité</th>
            <th style={{ ...thStyle, width: '11%', textAlign: 'right' }}>↓ actuel</th>
            <th style={{ ...thStyle, width: '11%', textAlign: 'right' }}>↑ actuel</th>
            <th style={{ ...thStyle, width: '11%', textAlign: 'right' }}>Pic ↓ / Cx</th>
            <th style={{ ...thStyle, width: '8%', textAlign: 'right' }}>% ligne</th>
          </tr>
        </thead>
        <tbody>

          {/* ── APPAREILS CONNECTÉS ── */}
          {activeDevices.length > 0 && (
            <SectionHeader
              icon={<Wifi size={12} />}
              label="Appareils connectés"
              count={activeDevices.length}
              color="#2563eb"
              expanded={true}
              onToggle={() => {}}
              dimmed={false}
            />
          )}
          {activeDevices.map(dev => (
            <DeviceRow
              key={dev.id}
              dev={dev}
              history={sparkHistories[dev.id] || []}
              inactive={false}
              expandedId={expandedDeviceId}
              setExpandedId={setExpandedDeviceId}
              appHistories={appHistories}
            />
          ))}

          {activeDevices.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                Aucun appareil actif détecté
              </td>
            </tr>
          )}

          {/* ── APPLICATIONS RÉSEAU DE CE PC ── */}
          <SectionHeader
            icon={<Globe size={12} />}
            label="Applications réseau (Ce PC)"
            count={networkApps.length}
            color="#6366f1"
            expanded={showApps}
            onToggle={() => setShowApps(s => !s)}
            dimmed={false}
          />
          {showApps && networkApps.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '14px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                Aucune application avec connexion réseau active
              </td>
            </tr>
          )}
          {showApps && networkApps.map(app => (
            <AppRow
              key={app.pid}
              proc={app}
              history={appHistories[app.pid] || []}
            />
          ))}

          {/* ── APPAREILS DÉCONNECTÉS ── */}
          {inactiveDevices.length > 0 && (
            <SectionHeader
              icon={<WifiOff size={12} />}
              label="Appareils hors ligne"
              count={inactiveDevices.length}
              color="#64748b"
              expanded={showInactive}
              onToggle={() => setShowInactive(s => !s)}
              dimmed={true}
            />
          )}
          {showInactive && inactiveDevices.map(dev => (
            <DeviceRow
              key={dev.id}
              dev={dev}
              history={[]}
              inactive={true}
              expandedId={null}
              setExpandedId={() => {}}
              appHistories={{}}
            />
          ))}

        </tbody>
      </table>
    </div>
  );
}
