import React, { useState } from 'react';
import { Settings, X, Wifi, ShieldAlert, AlertTriangle, Monitor, Moon, Sun, RotateCcw, Check, ExternalLink, ArrowLeftRight, Phone } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  settings = {},
  onSaveSettings,
  onRebootFreebox,
  freeboxModel = 'Freebox'
}) {
  const [localSettings, setLocalSettings] = useState({
    enableWifiAnalysis: true,
    enableNewDeviceAlert: true,
    enableOverloadAlert: true,
    enableSystrayWidget: true,
    enablePortForwarding: true,
    enableCallLogs: true,
    themeMode: 'system', // 'system' | 'dark' | 'light'
    highPingThreshold: 80,
    overloadPctThreshold: 95,
    ...settings
  });

  const [rebootConfirm, setRebootConfirm] = useState(false);
  const [rebooting, setRebooting] = useState(false);
  const [rebootMsg, setRebootMsg] = useState('');

  if (!isOpen) return null;

  const toggle = (key) => {
    const next = { ...localSettings, [key]: !localSettings[key] };
    setLocalSettings(next);
    onSaveSettings(next);
  };

  const setVal = (key, val) => {
    const next = { ...localSettings, [key]: val };
    setLocalSettings(next);
    onSaveSettings(next);
  };

  const handleReboot = async () => {
    setRebooting(true);
    setRebootMsg('');
    try {
      const res = await fetch('/api/freebox/reboot', { method: 'POST' });
      const data = await res.json();
      if (data && data.success) {
        setRebootMsg('Redémarrage en cours... La Freebox sera de nouveau disponible dans 2-3 minutes.');
      } else {
        setRebootMsg(data.error || 'Erreur lors de la demande de redémarrage.');
      }
    } catch (e) {
      setRebootMsg('Erreur de connexion lors du redémarrage.');
    } finally {
      setRebooting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 16
    }}>
      <div style={{
        background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0',
        borderRadius: 16, width: '100%', maxWidth: 540, boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings size={20} color="#0066ff" />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Paramètres Freenekit & Freebox
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, maxHeight: '75vh', overflowY: 'auto' }}>

          {/* 1. Analyse Wi-Fi */}
          <div style={settingRowStyle}>
            <div style={iconBoxStyle('#0066ff')}>
              <Wifi size={18} color="#0066ff" />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={titleStyle}>📶 Analyse de la Qualité Wi-Fi</strong>
              <span style={descStyle}>
                Affiche la puissance du signal (dBm), les normes Wi-Fi (Wi-Fi 5/6/7) et propose les meilleurs canaux.
              </span>
            </div>
            <ToggleSwitch
              active={localSettings.enableWifiAnalysis}
              onToggle={() => toggle('enableWifiAnalysis')}
            />
          </div>

          {/* 2. Anti-Intrusion */}
          <div style={settingRowStyle}>
            <div style={iconBoxStyle('#10b981')}>
              <ShieldAlert size={18} color="#10b981" />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={titleStyle}>🛡️ Alerte Nouvel Appareil Inconnu</strong>
              <span style={descStyle}>
                Notification Windows native si une nouvelle adresse MAC non autorisée rejoint votre Wi-Fi.
              </span>
            </div>
            <ToggleSwitch
              active={localSettings.enableNewDeviceAlert}
              onToggle={() => toggle('enableNewDeviceAlert')}
            />
          </div>

          {/* 3. Alerte Surcharge & Ping */}
          <div style={settingRowStyle}>
            <div style={iconBoxStyle('#f59e0b')}>
              <AlertTriangle size={18} color="#f59e0b" />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={titleStyle}>⚠️ Alerte Surcharge & High Ping</strong>
              <span style={descStyle}>
                Avertit si le Ping dépasse {localSettings.highPingThreshold} ms ou si le débit atteint {localSettings.overloadPctThreshold}% de la bande passante.
              </span>
            </div>
            <ToggleSwitch
              active={localSettings.enableOverloadAlert}
              onToggle={() => toggle('enableOverloadAlert')}
            />
          </div>

          {/* 4. Mini-Widget Systray Icon */}
          <div style={settingRowStyle}>
            <div style={iconBoxStyle('#6366f1')}>
              <Monitor size={18} color="#6366f1" />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={titleStyle}>📌 Widget Barre des Tâches (Systray)</strong>
              <span style={descStyle}>
                Affichage discret des débits (↓ 3.5M | ↑ 7.4M) dans la zone de notification Windows.
              </span>
            </div>
            <ToggleSwitch
              active={localSettings.enableSystrayWidget}
              onToggle={() => toggle('enableSystrayWidget')}
            />
          </div>

          {/* 5. Gestionnaire de Ports & NAT */}
          <div style={settingRowStyle}>
            <div style={iconBoxStyle('#0284c7')}>
              <ArrowLeftRight size={18} color="#0284c7" />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={titleStyle}>🔀 Gestionnaire de Ports & NAT</strong>
              <span style={descStyle}>
                Permet d'ajouter et gérer facilement les redirections de ports (Minecraft, Web, VPN) vers votre PC.
              </span>
            </div>
            <ToggleSwitch
              active={localSettings.enablePortForwarding}
              onToggle={() => toggle('enablePortForwarding')}
            />
          </div>

          {/* 6. Journal des Appels Fixes */}
          <div style={settingRowStyle}>
            <div style={iconBoxStyle('#059669')}>
              <Phone size={18} color="#059669" />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={titleStyle}>📞 Journal des Appels Fixes</strong>
              <span style={descStyle}>
                Consultation de l'historique des appels reçus, manqués et émis sur la ligne fixe de la Freebox.
              </span>
            </div>
            <ToggleSwitch
              active={localSettings.enableCallLogs}
              onToggle={() => toggle('enableCallLogs')}
            />
          </div>

          {/* 5. Synchronisation Thème Windows */}
          <div style={settingRowStyle}>
            <div style={iconBoxStyle('#8b5cf6')}>
              {localSettings.themeMode === 'dark' ? <Moon size={18} color="#8b5cf6" /> : <Sun size={18} color="#8b5cf6" />}
            </div>
            <div style={{ flex: 1 }}>
              <strong style={titleStyle}>🌙 Thème & Apparence</strong>
              <span style={descStyle}>
                Mode sombre, clair ou synchronisation automatique avec Windows 11.
              </span>
            </div>
            <select
              value={localSettings.themeMode}
              onChange={(e) => setVal('themeMode', e.target.value)}
              style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1',
                fontSize: 12, background: '#ffffff', color: '#0f172a', fontWeight: 600
              }}
            >
              <option value="system">💻 Auto (Windows)</option>
              <option value="light">☀️ Clair</option>
              <option value="dark">🌙 Sombre</option>
            </select>
          </div>

          {/* 6. Redémarrage 1-Click */}
          <div style={{
            background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 12, padding: 14, marginTop: 14
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: rebootConfirm || rebootMsg ? 10 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={iconBoxStyle('#ef4444')}>
                  <RotateCcw size={18} color="#ef4444" />
                </div>
                <div>
                  <strong style={{ fontSize: 13, display: 'block', color: '#b91c1c' }}>🔄 Redémarrage Freebox 1-Click</strong>
                  <span style={{ fontSize: 11, color: '#dc2626' }}>Redémarre à distance votre {freeboxModel}</span>
                </div>
              </div>

              {!rebootConfirm && !rebootMsg && (
                <button
                  onClick={() => setRebootConfirm(true)}
                  style={{
                    background: '#ef4444', color: 'white', border: 'none',
                    borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Redémarrer
                </button>
              )}
            </div>

            {rebootConfirm && !rebootMsg && (
              <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #fca5a5' }}>
                <p style={{ fontSize: 12, color: '#991b1b', margin: '0 0 10px 0', fontWeight: 600 }}>
                  ⚠️ Êtes-vous sûr de vouloir redémarrer votre {freeboxModel} ? La connexion sera coupée pendant 2 minutes.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleReboot}
                    disabled={rebooting}
                    style={{
                      flex: 1, background: '#ef4444', color: 'white', border: 'none',
                      borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {rebooting ? 'Redémarrage...' : 'Oui, redémarrer maintenant'}
                  </button>
                  <button
                    onClick={() => setRebootConfirm(false)}
                    style={{
                      background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1',
                      borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer'
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {rebootMsg && (
              <p style={{ fontSize: 12, color: '#059669', margin: 0, fontWeight: 600 }}>
                ✅ {rebootMsg}
              </p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #e2e8f0',
          background: '#f8fafc', display: 'flex', justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', background: '#0066ff', color: 'white',
              border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Enregistrer & Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ active, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none',
        background: active ? '#0066ff' : '#cbd5e1', cursor: 'pointer',
        position: 'relative', transition: 'background 0.2s ease', flexShrink: 0
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#ffffff',
        position: 'absolute', top: 3, left: active ? 23 : 3,
        transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }} />
    </button>
  );
}

const settingRowStyle = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '12px 0', borderBottom: '1px solid #f1f5f9'
};

const iconBoxStyle = (color) => ({
  width: 36, height: 36, borderRadius: 10,
  background: `${color}15`, display: 'flex', alignItems: 'center',
  justifyContent: 'center', flexShrink: 0
});

const titleStyle = {
  fontSize: 13, display: 'block', color: '#0f172a', marginBottom: 2
};

const descStyle = {
  fontSize: 11, color: '#64748b', lineHeight: 1.4, display: 'block'
};
