import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// Si algo falla al arrancar, mostrar el error en pantalla en lugar de una página en blanco.
function showFatal(message: string) {
  const root = document.getElementById('root');
  if (root && !root.childElementCount) {
    root.innerHTML = `<div style="padding:24px;font:16px system-ui"><p><strong>La app no ha podido arrancar.</strong></p><p style="color:#587076">${message.replace(/</g, '&lt;')}</p></div>`;
  }
}
window.addEventListener('error', (e) => showFatal(e.message));
window.addEventListener('unhandledrejection', (e) => showFatal(String(e.reason)));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service worker: permite instalar la app y terminar una sesión sin conexión.
// En algunos entornos (páginas incrustadas, navegación privada) leer navigator.serviceWorker lanza un error.
if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker?.register('./sw.js').catch(() => {});
    } catch {
      // Sin service worker la app funciona igual, solo que no sin conexión.
    }
  });
}
