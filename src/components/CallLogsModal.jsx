import React, { useState, useEffect } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, X, Clock, Calendar } from 'lucide-react';

export default function CallLogsModal({ isOpen, onClose }) {
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'missed' | 'incoming' | 'outgoing'

  useEffect(() => {
    if (isOpen) fetchCallLogs();
  }, [isOpen]);

  const fetchCallLogs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/freebox/calls');
      const data = await res.json();
      if (data && data.success) {
        setCallLogs(data.calls || []);
      } else {
        setErrorMsg(data.error || 'Impossible de récupérer l\'historique des appels.');
      }
    } catch (e) {
      setErrorMsg('Erreur de connexion au serveur Freenekit.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = callLogs.filter(c => {
    if (filterType === 'all') return true;
    if (filterType === 'missed') return c.type === 'missed';
    if (filterType === 'incoming') return c.type === 'in' || c.type === 'accepted';
    if (filterType === 'outgoing') return c.type === 'out';
    return true;
  });

  const fmtDuration = (sec) => {
    if (!sec || sec <= 0) return '0 sec';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m} min ${s}s` : `${s} sec`;
  };

  const fmtDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getCallIcon = (type) => {
    if (type === 'missed') return <PhoneMissed size={16} color="#ef4444" />;
    if (type === 'out') return <PhoneOutgoing size={16} color="#0066ff" />;
    return <PhoneIncoming size={16} color="#10b981" />;
  };

  const getCallLabel = (type) => {
    if (type === 'missed') return 'Manqué';
    if (type === 'out') return 'Émis';
    return 'Reçu';
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
        borderRadius: 16, width: '100%', maxWidth: 580, boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Phone size={20} color="#0066ff" />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Journal des Appels Fixes Freebox
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20, maxHeight: '75vh', overflowY: 'auto' }}>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[
              { id: 'all', label: 'Tous les appels' },
              { id: 'missed', label: '❌ Manqués' },
              { id: 'incoming', label: '📥 Reçus' },
              { id: 'outgoing', label: '📤 Émis' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none',
                  background: filterType === f.id ? '#0066ff' : '#f1f5f9',
                  color: filterType === f.id ? 'white' : '#475569',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {errorMsg && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, fontWeight: 600 }}>❌ {errorMsg}</p>}

          {loading && (
            <p style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: 13 }}>
              Chargement du journal des appels...
            </p>
          )}

          {!loading && filteredLogs.length === 0 && (
            <p style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: 13 }}>
              Aucun appel enregistré.
            </p>
          )}

          {!loading && filteredLogs.map(c => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
              background: c.type === 'missed' ? 'rgba(239,68,68,0.03)' : '#f8fafc',
              marginBottom: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: c.type === 'missed' ? 'rgba(239,68,68,0.1)' : 'rgba(37,99,235,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {getCallIcon(c.type)}
                </div>
                <div>
                  <strong style={{ fontSize: 13, display: 'block', color: '#0f172a' }}>
                    {c.name || c.number || 'Numéro masqué'}
                  </strong>
                  <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={10} /> {fmtDate(c.datetime)}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, display: 'block',
                  color: c.type === 'missed' ? '#ef4444' : '#10b981'
                }}>
                  {getCallLabel(c.type)}
                </span>
                <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                  <Clock size={10} /> {fmtDuration(c.duration)}
                </span>
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
