import React, { useState, useEffect } from 'react';
import HeaderAlert from './components/HeaderAlert';
import BandwidthChart from './components/BandwidthChart';
import DeviceTable from './components/DeviceTable';
import FreeboxPairingModal from './components/FreeboxPairingModal';
import SystemTrayWindow from './components/SystemTrayWindow';
import SettingsModal from './components/SettingsModal';
import PortForwardingModal from './components/PortForwardingModal';
import CallLogsModal from './components/CallLogsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { Sun, Moon, Wifi, Layers, ShieldAlert, Settings, ArrowLeftRight, Phone } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState('light');
  const [timeRange, setTimeRange] = useState('5 min');
  const [devices, setDevices] = useState([]);
  const [networkApps, setNetworkApps] = useState([]);
  const [totalDown, setTotalDown] = useState(0.0);
  const [totalUp, setTotalUp] = useState(0.0);
  const [maxDown, setMaxDown] = useState(1000);
  const [maxUp, setMaxUp] = useState(700);
  const [pingBox, setPingBox] = useState(2);
  const [pingInternet, setPingInternet] = useState(24);
  const [isPaired, setIsPaired] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [apiErrors, setApiErrors] = useState([]);
  const [permissionError, setPermissionError] = useState(false);
  const [freeboxModel, setFreeboxModel] = useState('Freebox');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPortsOpen, setIsPortsOpen] = useState(false);
  const [isCallsOpen, setIsCallsOpen] = useState(false);
  const [userSettings, setUserSettings] = useState({
    enableWifiAnalysis: true,
    enableNewDeviceAlert: true,
    enableOverloadAlert: true,
    enableSystrayWidget: true,
    enablePortForwarding: true,
    enableCallLogs: true,
    themeMode: 'system',
    highPingThreshold: 80,
    overloadPctThreshold: 95
  });

  // Windows Theme Auto-Sync
  useEffect(() => {
    if (userSettings.themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystemTheme = (e) => setTheme(e.matches ? 'dark' : 'light');
      setTheme(mediaQuery.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', applySystemTheme);
      return () => mediaQuery.removeEventListener('change', applySystemTheme);
    } else if (userSettings.themeMode === 'dark' || userSettings.themeMode === 'light') {
      setTheme(userSettings.themeMode);
    }
  }, [userSettings.themeMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Check pairing status immediately on mount (fast, doesn't need full auth)
  useEffect(() => {
    fetch('/api/freebox/paired')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.isPaired) setIsPaired(true);
        if (data && data.model) setFreeboxModel(data.model);
      })
      .catch(() => {});
  }, []);

  // Fetch real status & real devices
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/freebox/devices');
        if (res.ok) {
          const data = await res.json();
          setDevices(data.devices || []);
          setNetworkApps(data.networkApps || []);
          setApiErrors(data.errors || []);
          setPermissionError(!!data.permissionError);
          setTotalDown(data.totalDownloadMbit || 0.0);
          setTotalUp(data.totalUploadMbit || 0.0);
          setMaxDown(data.maxDownloadMbit || 1000);
          setMaxUp(data.maxUploadMbit || 700);
          setIsPaired(prev => prev || !!data.isPaired);
          if (data.model) setFreeboxModel(data.model);

          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          
          setHistoryData(prev => {
            const next = [...prev];
            if (next.length >= 20) next.shift();
            next.push({ time: timeStr, down: data.totalDownloadMbit || 0, up: data.totalUploadMbit || 0 });
            return next;
          });
        }
      } catch (err) {
        console.warn('Erreur lors de la récupération des données réelles:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const topHog = devices.length > 0 ? [...devices].sort((a, b) => b.down - a.down)[0] : null;
  const downPct = maxDown > 0 ? Math.round((totalDown / maxDown) * 100) : 0;
  const upPct = maxUp > 0 ? Math.round((totalUp / maxUp) * 100) : 0;

  return (
    <ErrorBoundary>
      <div className="app-window">
        {/* Title Bar */}
        <header className="window-titlebar">
          <div className="titlebar-brand">
            <Wifi size={16} color="var(--accent-blue)" />
            <span>Freenekit</span>
            <span className="freebox-badge">{isPaired ? `${freeboxModel} connectée` : 'Non Associée'}</span>
          </div>

          <div className="titlebar-actions">
            <button 
              className="win-btn"
              style={{
                background: isPaired ? 'rgba(16, 185, 129, 0.1)' : 'var(--accent-blue)',
                color: isPaired ? '#10b981' : 'white',
                fontWeight: 600,
                padding: '4px 12px'
              }}
              onClick={() => setIsPairModalOpen(true)}
            >
              {isPaired ? '✓ Freebox Associée' : 'Associer ma Freebox'}
            </button>

            <button 
              className="win-btn"
              onClick={() => setIsTrayOpen(!isTrayOpen)}
              title="Aperçu Barre des tâches Windows"
            >
              <Layers size={14} />
            </button>

            {userSettings.enablePortForwarding !== false && (
              <button
                className="win-btn"
                onClick={() => setIsPortsOpen(true)}
                title="Redirection de Ports & NAT (Minecraft, Web, VPN)"
              >
                <ArrowLeftRight size={14} />
              </button>
            )}

            {userSettings.enableCallLogs !== false && (
              <button
                className="win-btn"
                onClick={() => setIsCallsOpen(true)}
                title="Journal des Appels Fixes Freebox"
              >
                <Phone size={14} />
              </button>
            )}

            <button 
              className="win-btn" 
              onClick={() => setIsSettingsOpen(true)}
              title="Paramètres & Options"
            >
              <Settings size={14} />
            </button>

            <button 
              className="win-btn" 
              onClick={() => {
                const nextMode = theme === 'light' ? 'dark' : 'light';
                setUserSettings(s => ({ ...s, themeMode: nextMode }));
              }}
              title="Changer de thème"
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
          </div>
        </header>

        {/* Main App Container */}
        <main className="main-container">
          {/* Connection / Pairing Notice Banner if not paired */}
          {!isPaired && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 10,
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#b45309'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldAlert size={20} color="#f59e0b" />
                <div>
                  <strong style={{ fontSize: 14 }}>Freebox non associée</strong>
                  <p style={{ fontSize: 12, opacity: 0.9 }}>
                    Pour lister les VRAIS appareils de votre domicile, cliquez sur le bouton d'association. Seuls vos vrais processus Windows locaux sont affichés ci-dessous.
                  </p>
                </div>
              </div>
              <button 
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
                onClick={() => setIsPairModalOpen(true)}
              >
                Lancer le tutoriel
              </button>
            </div>
          )}

          {/* Bandeau erreur permissions Freebox */}
          {isPaired && permissionError && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10,
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#b91c1c',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 20 }}>🔒</span>
                <div>
                  <strong style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>
                    Permissions Freebox manquantes
                  </strong>
                  <span style={{ fontSize: 12, color: '#dc2626' }}>
                    Freenekit est associé mais n'a pas accès aux données réseau.
                    Allez sur <strong>mafreebox.freebox.fr</strong> → Paramètres → Gestion des accès → Applications
                    → double-cliquez sur <em>Freenekit Windows</em> et cochez toutes les permissions.
                  </span>
                </div>
              </div>
              <a
                href="http://mafreebox.freebox.fr"
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#ef4444', color: 'white', border: 'none',
                  padding: '8px 14px', borderRadius: 6, fontWeight: 600,
                  fontSize: 12, cursor: 'pointer', textDecoration: 'none',
                  whiteSpace: 'nowrap', flexShrink: 0
                }}
              >
                Ouvrir Freebox OS
              </a>
            </div>
          )}
          {isPaired && (
            <HeaderAlert 
              topHog={topHog} 
              totalDown={totalDown} 
              maxDown={maxDown} 
              internetPing={pingInternet} 
            />
          )}

          {/* Throughput Bar & Filters */}
          <div className="metrics-toolbar">
            <div className="throughput-bars">
              <div className="tp-row">
                <span className="tp-arrow down">↓</span>
                <div className="tp-bar-container">
                  <div className="tp-fill down" style={{ width: `${Math.min(100, downPct)}%` }} />
                </div>
                <span className="tp-val">{totalDown.toFixed(1)} Mbit/s — {downPct} %</span>
              </div>

              <div className="tp-row">
                <span className="tp-arrow up">↑</span>
                <div className="tp-bar-container">
                  <div className="tp-fill up" style={{ width: `${Math.min(100, upPct)}%` }} />
                </div>
                <span className="tp-val">{totalUp.toFixed(1)} Mbit/s — {upPct} %</span>
              </div>
            </div>

            <div className="ping-and-time">
              <div className="ping-tag">
                <span>Box</span>
                <span className="ping-val">{pingBox} ms</span>
              </div>
              <div className="ping-tag" style={{ border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <span>Internet</span>
                <span className="ping-val">{pingInternet} ms</span>
              </div>

              <div className="time-range-picker">
                {['1 min', '5 min', '30 min', '1 h', '24 h'].map(t => (
                  <button
                    key={t}
                    className={`time-btn ${timeRange === t ? 'active' : ''}`}
                    onClick={() => setTimeRange(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Realtime Bandwidth Chart */}
          <BandwidthChart historyData={historyData} maxMbit={maxDown} />

          {/* Authentic Device & Process Table */}
          <DeviceTable devices={devices} networkApps={networkApps} />
        </main>

        {/* Freebox Step-by-Step Association Tutorial Modal */}
        <FreeboxPairingModal 
          isOpen={isPairModalOpen} 
          onClose={() => setIsPairModalOpen(false)} 
          onPaired={() => {
            setIsPaired(true);       // mise à jour immédiate de l'UI
            setIsPairModalOpen(false);
          }} 
        />

        {/* Modals pour NAT & Appels */}
        <PortForwardingModal
          isOpen={isPortsOpen}
          onClose={() => setIsPortsOpen(false)}
          localIp={devices.find(d => d.isLocal)?.ip || ''}
        />

        <CallLogsModal
          isOpen={isCallsOpen}
          onClose={() => setIsCallsOpen(false)}
        />

        {/* Settings & Options Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={userSettings}
          onSaveSettings={(next) => {
            setUserSettings(next);
            fetch('/api/freebox/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(next)
            }).catch(() => {});
          }}
          freeboxModel={freeboxModel}
        />
      </div>
    </ErrorBoundary>
  );
}
