import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { startNeonSweep } from './lib/neonSweep';

// Solo estético: desincroniza el barrido neón de cada título (§ 6.5).
startNeonSweep();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
