import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  componentDidCatch(error) { this.setState({ error }); }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, fontFamily: 'monospace', color: '#f87171', background: '#0D1B2E', minHeight: '100vh' }}>
        <h2>Erreur détectée :</h2>
        <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
        <pre style={{ marginTop: 8, fontSize: 11, opacity: .6 }}>{this.state.error.stack}</pre>
      </div>
    );
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

