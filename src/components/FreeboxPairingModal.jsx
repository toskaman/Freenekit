import React, { useState, useEffect } from 'react';
import { Wifi, Check, ShieldAlert, X, ArrowRight, Info, AlertTriangle, RefreshCw, Key, Monitor, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-react';

export default function FreeboxPairingModal({ isOpen, onClose, onPaired }) {
  const [currentStep, setCurrentStep] = useState(1); // 1:Tutorial 2:Waiting 3:Success 4:Permissions
  const [trackId, setTrackId] = useState(null);
  const [appToken, setAppToken] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [selfTest, setSelfTest] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrorMsg('');
      setIsRequesting(false);
      setSelfTest(null);
    }
  }, [isOpen]);

  const runSelfTest = async () => {
    setSelfTest('loading');
    try {
      const r = await fetch('/api/freebox/selftest');
      const data = await r.json();
      setSelfTest(data);
    } catch { setSelfTest({ error: true }); }
  };


  const handleSendPairRequest = async () => {
    setIsRequesting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/freebox/pair/request', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      
      const data = await res.json();
      if (data && data.success) {
        setTrackId(data.trackId);
        setAppToken(data.appToken);
        setCurrentStep(2);
      } else {
        setCurrentStep(2);
      }
    } catch (err) {
      console.warn('Pair request error:', err);
      setCurrentStep(2);
    } finally {
      setIsRequesting(false);
    }
  };

  // Poll Freebox association status if trackId exists
  useEffect(() => {
    if (currentStep !== 2 || !trackId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/freebox/pair/status/${trackId}?appToken=${encodeURIComponent(appToken)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'granted') {
            clearInterval(interval);
            setCurrentStep(3);
            if (onPaired) onPaired();
          } else if (data.status === 'denied' || data.status === 'timeout') {
            clearInterval(interval);
            setErrorMsg('La demande d\'accès a été refusée ou a expiré sur votre Freebox.');
            setCurrentStep(4);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentStep, trackId, appToken, onPaired]);

  if (!isOpen) return null;

  const saveTokenAndConfirm = async (tokenToSave) => {
    if (tokenToSave) {
      try {
        await fetch('/api/freebox/pair/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appToken: tokenToSave })
        });
      } catch (e) {
        console.warn('Impossible de sauvegarder le token:', e);
      }
    }
    if (onPaired) onPaired();
    // Passe à l'étape permissions au lieu de fermer
    setCurrentStep(4);
  };

  const handleManualConfirmSuccess = () => saveTokenAndConfirm(appToken);
  const handleFinish = () => { onClose(); };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.2s ease',
      padding: 16
    }}>
      <div style={{
        background: '#ffffff',
        color: '#0f172a',
        border: '1px solid #e2e8f0',
        borderRadius: 18,
        padding: 28,
        width: 560,
        maxWidth: '94vw',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        position: 'relative'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(0, 102, 255, 0.1)', padding: 10, borderRadius: 12 }}>
              <Wifi size={22} color="#0066ff" />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>Association Freebox</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Tutoriel de connexion étape par étape</p>
            </div>
          </div>
          <button 
            style={{
              background: 'rgba(0,0,0,0.05)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }} 
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Wizard Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: currentStep >= 1 ? '#0066ff' : '#e2e8f0',
              color: currentStep >= 1 ? 'white' : '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13
            }}>1</div>
            <span style={{ fontSize: 12, fontWeight: currentStep === 1 ? 700 : 500, color: '#334155' }}>Préparation</span>
          </div>

          <div style={{ flex: 1, height: 2, background: '#e2e8f0', margin: '0 10px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: currentStep >= 2 ? '#0066ff' : '#e2e8f0',
              color: currentStep >= 2 ? 'white' : '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13
            }}>2</div>
            <span style={{ fontSize: 12, fontWeight: currentStep === 2 ? 700 : 500, color: '#334155' }}>Validation (▶)</span>
          </div>

          <div style={{ flex: 1, height: 2, background: '#e2e8f0', margin: '0 10px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: currentStep === 3 ? '#10b981' : '#e2e8f0',
              color: currentStep === 3 ? 'white' : '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13
            }}>3</div>
            <span style={{ fontSize: 12, fontWeight: currentStep === 3 ? 700 : 500, color: '#334155' }}>Activé</span>
          </div>
        </div>

        {/* STEP 1: Instructions */}
        {currentStep === 1 && (
          <div>
            {/* ⚠️ Prérequis réseau — toujours visible en haut */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,88,12,0.08))',
              border: '1.5px solid rgba(245,158,11,0.5)',
              borderRadius: 12,
              padding: '12px 16px',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              marginBottom: 16
            }}>
              <span style={{
                fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1
              }}>⚠️</span>
              <div>
                <strong style={{ fontSize: 13, display: 'block', color: '#92400e', marginBottom: 3 }}>
                  Prérequis indispensable : même réseau que la Freebox
                </strong>
                <span style={{ fontSize: 12, color: '#b45309', lineHeight: 1.5 }}>
                  Votre PC doit être connecté <strong>en Wi-Fi ou en Ethernet directement à votre Freebox</strong> — pas via un répéteur tiers, ni par partage de connexion.
                  Sans cela, Freenekit ne peut pas joindre <code style={{ background: 'rgba(0,0,0,0.06)', borderRadius: 4, padding: '1px 5px' }}>mafreebox.freebox.fr</code> et l'association échouera.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Monitor size={20} color="#0066ff" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ fontSize: 14, display: 'block', color: '#0f172a', marginBottom: 2 }}>1. Positionnez-vous devant votre Freebox Server</strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Repérez l'écran numérique (OLED / LCD) situé sur la face avant de votre Freebox (Ultra, Pop, Delta ou Révolution).
                  </span>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Key size={20} color="#0066ff" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ fontSize: 14, display: 'block', color: '#0f172a', marginBottom: 2 }}>2. Demande d'autorisation de sécurité</strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Lorsque vous cliquerez sur le bouton ci-dessous, Freenekit enverra une demande d'accès sécurisée à votre box.
                  </span>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <ArrowRight size={20} color="#0066ff" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ fontSize: 14, display: 'block', color: '#0f172a', marginBottom: 2 }}>3. Appuyez sur la flèche droite (▶)</strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Un message <em>"Autoriser l'application ?"</em> apparaîtra sur l'écran de la box. Pressez le bouton flèche droite pour confirmer.
                  </span>
                </div>
              </div>
            </div>

            <button 
              style={{
                width: '100%',
                padding: '13px 16px',
                background: '#0066ff',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(0, 102, 255, 0.25)'
              }}
              disabled={isRequesting}
              onClick={handleSendPairRequest}
            >
              {isRequesting ? (
                <>
                  <RefreshCw size={16} className="spin-icon" />
                  <span>Envoi de la demande...</span>
                </>
              ) : (
                <>
                  <span>Lancer la procédure d'association</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 2: Interactive Screen Simulation & Waiting */}
        {currentStep === 2 && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              background: '#090d16',
              color: '#38bdf8',
              borderRadius: 14,
              padding: 24,
              fontFamily: 'Consolas, Monaco, monospace',
              fontSize: 14,
              marginBottom: 20,
              border: '2px solid #0284c7',
              boxShadow: '0 0 20px rgba(2, 132, 199, 0.35)',
              position: 'relative'
            }}>
              <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 12, marginBottom: 10, letterSpacing: 1 }}>
                ● ÉCRAN FRONTAL FREEBOX SERVER
              </div>
              <div style={{ fontSize: 15, color: '#f8fafc', fontWeight: 600, marginBottom: 4 }}>
                Autoriser l'accès ?
              </div>
              <div style={{ fontSize: 16, color: '#facc15', fontWeight: 700, marginBottom: 12 }}>
                App : Freenekit Windows
              </div>
              <div style={{ fontSize: 13, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '6px 12px', borderRadius: 6, display: 'inline-block' }}>
                ▶ Appuyez sur la flèche droite de la box
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#64748b', fontSize: 13, marginBottom: 20 }}>
              <RefreshCw size={16} className="spin-icon" color="#0066ff" />
              <span>En attente de votre pression sur la touche <strong>▶</strong> de la Freebox...</span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#059669',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
                onClick={handleManualConfirmSuccess}
              >
                J'ai appuyé sur ▶ (Valider)
              </button>

              <button 
                style={{
                  padding: '11px 14px',
                  background: 'transparent',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
                onClick={() => setCurrentStep(1)}
              >
                Retour
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Pairing Success → redirects to permissions */}
        {currentStep === 3 && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', width: 68, height: 68, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={40} color="#10b981" />
            </div>
            <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>Freebox Associée avec Succès !</h4>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
              Votre clé d'accès a été enregistrée. Une dernière étape : accordez les permissions réseau à Freenekit.
            </p>
            <button
              style={{ width: '100%', padding: '12px 16px', background: '#0066ff', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,102,255,0.25)' }}
              onClick={() => setCurrentStep(4)}
            >
              Étape suivante : Permissions →
            </button>
          </div>
        )}

        {/* STEP 4: Guide permissions Freebox OS */}
        {currentStep === 4 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ background: 'rgba(0,102,255,0.1)', padding: 10, borderRadius: 10 }}>
                <ShieldCheck size={22} color="#0066ff" />
              </div>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Accorder les permissions réseau</h4>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Obligatoire pour voir les appareils et les débits réels</p>
              </div>
            </div>

            {/* Steps numérotés */}
            {[
              { n: 1, text: 'Ouvrez un navigateur et allez sur', code: 'http://mafreebox.freebox.fr', url: 'http://mafreebox.freebox.fr' },
              { n: 2, text: 'Allez dans', code: 'Paramètres → Mode Avancé → Gestion des accès → Applications' },
              { n: 3, text: 'Double-cliquez sur', code: 'Freenekit Windows' },
              { n: 4, text: 'Cochez', code: '✅ Paramètres   ✅ Accès réseau local   ✅ Connexion & état' },
              { n: 5, text: 'Cliquez sur Enregistrer, puis fermez et relancez Freenekit.' },
            ].map(step => (
              <div key={step.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#0066ff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                  {step.n}
                </div>
                <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>
                  {step.text}{' '}
                  {step.code && (
                    step.url
                      ? <a href={step.url} target="_blank" rel="noreferrer" style={{ color: '#0066ff', fontWeight: 600, textDecoration: 'none' }}>{step.code} <ExternalLink size={10} style={{ verticalAlign: 'middle' }} /></a>
                      : <code style={{ background: '#f1f5f9', borderRadius: 4, padding: '2px 6px', fontSize: 11, color: '#0f172a' }}>{step.code}</code>
                  )}
                </div>
              </div>
            ))}

            {/* Self-test */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: selfTest && selfTest !== 'loading' ? 10 : 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>🔬 Vérification automatique</span>
                <button
                  onClick={runSelfTest}
                  style={{ background: '#0066ff', color: 'white', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  {selfTest === 'loading' ? '⏳ Test en cours...' : selfTest ? '🔄 Retester' : '▶ Lancer le test'}
                </button>
              </div>

              {selfTest && selfTest !== 'loading' && !selfTest.error && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { label: 'Freebox détectée', ok: selfTest.discovery?.ok, detail: selfTest.discovery?.model ? `${selfTest.discovery.model} · API ${selfTest.discovery.apiVer}` : '' },
                    { label: 'Association valide', ok: selfTest.auth?.ok, detail: selfTest.auth?.reason || '' },
                    { label: 'Stats de connexion', ok: selfTest.connection?.ok, detail: selfTest.connection?.ok ? `↓ ${selfTest.connection.rateDown} Mbit/s · ↑ ${selfTest.connection.rateUp} Mbit/s` : (selfTest.connection?.error || '') },
                    { label: 'Appareils LAN', ok: selfTest.lan?.ok, detail: selfTest.lan?.ok ? `${selfTest.lan.connected} connectés / ${selfTest.lan.total} connus` : (selfTest.lan?.error || '') },
                    { label: 'Infos système', ok: selfTest.system?.ok, detail: selfTest.system?.firmware || '' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                      <span style={{ fontSize: 14 }}>{row.ok ? '✅' : '❌'}</span>
                      <span style={{ fontWeight: 600, color: '#334155', minWidth: 160 }}>{row.label}</span>
                      <span style={{ color: '#64748b' }}>{row.detail}</span>
                    </div>
                  ))}
                </div>
              )}
              {selfTest?.error && <p style={{ color: '#ef4444', fontSize: 11, margin: 0 }}>Erreur lors du test — relancez le .exe sur le même réseau que la Freebox.</p>}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                style={{ flex: 1, padding: '11px 14px', background: '#10b981', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                onClick={handleFinish}
              >
                Terminer — Accéder au moniteur
              </button>
              <button
                style={{ padding: '11px 14px', background: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}
                onClick={() => setCurrentStep(3)}
              >
                ← Retour
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Error */}
        {currentStep === 5 && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>Association non finalisée</h4>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              {errorMsg || "Assurez-vous que votre PC est bien connecté en Wi-Fi ou Ethernet à votre Freebox."}
            </p>
            <button
              style={{ width: '100%', padding: '11px 16px', background: '#0066ff', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}
              onClick={() => setCurrentStep(1)}
            >
              Recommencer le tutoriel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
