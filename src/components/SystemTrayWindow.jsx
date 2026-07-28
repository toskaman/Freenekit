import React from 'react';
import { Wifi, AlertTriangle, ShieldCheck, X } from 'lucide-react';

export default function SystemTrayWindow({ isOpen, onClose, totalDown, maxDown, topHog }) {
  if (!isOpen) return null;

  const isSaturated = (totalDown / maxDown) >= 0.8;

  return (
    <div className="tray-overlay">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}>
          <Wifi size={16} color={isSaturated ? '#ef4444' : '#10b981'} />
          <span>Freenekit — Barre d'état</span>
        </div>
        <button className="win-btn" onClick={onClose}><X size={14} /></button>
      </div>

      <div style={{
        background: isSaturated ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        padding: 10,
        borderRadius: 8,
        fontSize: 12,
        marginBottom: 10
      }}>
        {isSaturated ? (
          <div style={{ color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} />
            <span>Trafic saturé par {topHog ? topHog.name : 'un appareil'}</span>
          </div>
        ) : (
          <div style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} />
            <span>Débit Freebox optimal</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
        <span>↓ Descendant : <strong>{(totalDown).toFixed(1)} Mbit/s</strong></span>
        <span>↑ Montant : <strong>{(totalDown * 0.08).toFixed(1)} Mbit/s</strong></span>
      </div>
    </div>
  );
}
