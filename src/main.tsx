import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { startNeonSweep } from './lib/neonSweep';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Solo estético: barrido neón en los títulos, cada uno con su fase (§ 6.5).
// Va DESPUES del render y en try/catch a propósito: un efecto visual jamás debe
// impedir que la aplicación monte. Si falla, se pierde el brillo y nada más.
try {
  startNeonSweep();
} catch (e) {
  console.warn('[neonSweep] deshabilitado por un error:', e);
}
