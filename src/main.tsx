import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// The admin panel lets the admin set a backend server URL (stored in localStorage
// as "fitway_server_url"). All API calls now prepend getApiBase() from @/lib/api,
// so the global fetch interceptor is no longer needed. If the env var is set it
// seeds localStorage for first-time use.
const envBase = (import.meta.env.VITE_API_BASE as string) || '';
if (envBase && !localStorage.getItem('fitway_server_url')) {
  localStorage.setItem('fitway_server_url', envBase.replace(/\/+$/, ''));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
