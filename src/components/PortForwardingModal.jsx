import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, X, Plus, Trash2, Check, Shield, Server, Gamepad2, Globe, Cpu } from 'lucide-react';

export default function PortForwardingModal({ isOpen, onClose, localIp = '' }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // New Rule Form
  const [comment, setComment] = useState('Minecraft Server');
  const [proto, setProto] = useState('tcp');
  const [port, setPort] = useState('25565');
  const [targetIp, setTargetIp] = useState(localIp || '192.168.1.23');

  useEffect(() => {
    if (isOpen) {
      fetchRules();
      if (localIp) setTargetIp(localIp);
    }
  }, [isOpen, localIp]);

  const fetchRules = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/freebox/ports');
      const data = await res.json();
      if (data && data.success) {
        setRules(data.rules || []);
      } else {
        setErrorMsg(data.error || 'Impossible de récupérer les redirections de ports.');
      }
    } catch (e) {
      setErrorMsg('Erreur de connexion au serveur Freenekit.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (!port || !targetIp) {
      setErrorMsg('Veuillez remplir le port et l\'adresse IP destination.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const p = parseInt(port);
      const res = await fetch('/api/freebox/ports/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          comment: comment || 'Freenekit Rule',
          lan_port: p,
          wan_port_start: p,
          wan_port_end: p,
          ip: targetIp,
          ip_proto: proto
        })
      });
      const data = await res.json();
      if (data && data.success) {
        setSuccessMsg(`Règle "${comment}" (${port}/${proto.toUpperCase()}) ajoutée avec succès !`);
        fetchRules();
      } else {
        setErrorMsg(data.error || 'Erreur lors de l\'ajout de la règle.');
      }
    } catch (e) {
      setErrorMsg('Erreur réseau lors de l\'ajout de la règle.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette redirection de port ?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/freebox/ports/${ruleId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data && data.success) {
        setSuccessMsg('Règle supprimée avec succès.');
        fetchRules();
      } else {
        setErrorMsg(data.error || 'Erreur lors de la suppression.');
      }
    } catch (e) {
      setErrorMsg('Erreur réseau lors de la suppression.');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (presetName, presetPort, presetProto) => {
    setComment(presetName);
    setPort(presetPort + '');
    setProto(presetProto);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 16
    }}>
      <div style={{
        background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0',
        borderRadius: 16, width: '100%', maxWidth: 640, boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ArrowLeftRight size={20} color="#0066ff" />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Gestionnaire de Ports & NAT (Freebox)
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20, maxHeight: '78vh', overflowY: 'auto' }}>

          {/* Quick Presets */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 8 }}>
              ⚡ Raccourcis Rapides (Presets)
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { name: 'Minecraft', port: 25565, proto: 'tcp', icon: <Gamepad2 size={13} /> },
                { name: 'Web HTTP', port: 80, proto: 'tcp', icon: <Globe size={13} /> },
                { name: 'Web HTTPS', port: 443, proto: 'tcp', icon: <Shield size={13} /> },
                { name: 'SSH', port: 22, proto: 'tcp', icon: <Server size={13} /> },
                { name: 'WireGuard VPN', port: 51820, proto: 'udp', icon: <Cpu size={13} /> },
              ].map(p => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p.name, p.port, p.proto)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc',
                    color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  {p.icon}
                  {p.name} ({p.port})
                </button>
              ))}
            </div>
          </div>

          {/* Form Ajouter Règle */}
          <div style={{ background: 'rgba(0,102,255,0.04)', border: '1px solid rgba(0,102,255,0.2)', borderRadius: 12, padding: 14, marginBottom: 18 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0066ff', display: 'block', marginBottom: 10 }}>
              ➕ Ajouter une nouvelle redirection de port
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Description</label>
                <input
                  type="text" value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Ex: Serveur Minecraft" style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Protocole</label>
                <select value={proto} onChange={e => setProto(e.target.value)} style={inputStyle}>
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Port</label>
                <input
                  type="number" value={port} onChange={e => setPort(e.target.value)}
                  placeholder="25565" style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>IP Destination (PC)</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    type="text" value={targetIp} onChange={e => setTargetIp(e.target.value)}
                    placeholder="192.168.1.xx" style={inputStyle}
                  />
                  {localIp && (
                    <button
                      onClick={() => setTargetIp(localIp)}
                      title="Utiliser l'IP de ce PC"
                      style={{ background: '#0066ff', color: 'white', border: 'none', borderRadius: 6, padding: '0 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Ce PC
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleAddRule} disabled={loading}
              style={{
                width: '100%', padding: '9px 14px', background: '#0066ff', color: 'white',
                border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer'
              }}
            >
              {loading ? 'Création en cours...' : 'Ajouter la règle sur la Freebox'}
            </button>
          </div>

          {errorMsg && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, fontWeight: 600 }}>❌ {errorMsg}</p>}
          {successMsg && <p style={{ color: '#10b981', fontSize: 12, marginBottom: 12, fontWeight: 600 }}>✅ {successMsg}</p>}

          {/* Liste des Règles Actives */}
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 8 }}>
            📋 Règles NAT / Ports actives sur la Freebox ({rules.length})
          </span>

          {rules.length === 0 && !loading && (
            <p style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
              Aucune redirection de port configurée.
            </p>
          )}

          {rules.map(r => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
              background: '#f8fafc', marginBottom: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: r.ip_proto === 'tcp' ? 'rgba(37,99,235,0.1)' : 'rgba(16,185,129,0.1)',
                  color: r.ip_proto === 'tcp' ? '#2563eb' : '#10b981', textTransform: 'uppercase'
                }}>
                  {r.ip_proto}
                </span>
                <div>
                  <strong style={{ fontSize: 13, display: 'block', color: '#0f172a' }}>
                    {r.comment || 'Sans nom'} · Port {r.wan_port_start}
                  </strong>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Redirigé vers <strong>{r.lan_ip || r.hostname}</strong>:{r.lan_port}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDeleteRule(r.id)}
                title="Supprimer la règle"
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6 }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3 };
const inputStyle = { width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#ffffff', color: '#0f172a' };
