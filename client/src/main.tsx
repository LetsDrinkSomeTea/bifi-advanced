import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './main.css';
import { App } from './App';

registerSW({ immediate: true });

const container = document.getElementById('root');
if (!container) throw new Error('No root element found');
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
