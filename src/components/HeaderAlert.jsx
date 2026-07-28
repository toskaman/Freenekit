import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function HeaderAlert({ topHog, totalDown, maxDown, internetPing }) {
  const isSaturated = (totalDown / maxDown) >= 0.8;
  const hogName = topHog ? topHog.name : 'Appareil inconnu';
  const hogPct = topHog ? Math.round(topHog.pctLine) : 0;

  if (isSaturated) {
    return (
      <div className="alert-banner">
        <div className="alert-content">
          <div className="alert-dot" />
          <span>Download saturé ({hogPct} %) — {hogName}</span>
        </div>
        <div className="alert-subtext">
          Latence internet : {internetPing} ms
        </div>
      </div>
    );
  }

  return (
    <div className="alert-banner" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#065f46' }}>
      <div className="alert-content">
        <CheckCircle2 size={16} color="#10b981" />
        <span>Réseau fluide — Connexion optimisée</span>
      </div>
      <div className="alert-subtext" style={{ color: '#047857' }}>
        Latence internet : {internetPing} ms
      </div>
    </div>
  );
}
