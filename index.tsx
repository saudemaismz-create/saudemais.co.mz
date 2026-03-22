
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h1>Saúde Mais</h1>
    <p>Se estiver a ver esta mensagem, o sistema de renderização básico está a funcionar.</p>
    <button onClick={() => window.location.reload()}>Recarregar</button>
  </div>
);
