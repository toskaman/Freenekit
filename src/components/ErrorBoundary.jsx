import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Freenekit React Error Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 30,
          textAlign: 'center',
          background: '#fff',
          color: '#1f2937',
          borderRadius: 12,
          border: '1px solid #fee2e2',
          margin: 20
        }}>
          <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>Une erreur d'affichage est survenue</h3>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            {this.state.error ? this.state.error.toString() : 'Erreur indéterminée'}
          </p>
          <button 
            style={{
              padding: '10px 18px',
              background: '#0066ff',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
            onClick={() => this.setState({ hasError: false })}
          >
            <RefreshCw size={16} /> Recharger le composant
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
