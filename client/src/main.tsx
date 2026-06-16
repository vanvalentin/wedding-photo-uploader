import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AdminApp } from './AdminApp';
import { I18nProvider } from './i18n/I18nContext';
import './index.css';

const isAdminRoute = window.location.pathname.startsWith('/admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      {isAdminRoute ? <AdminApp /> : <App />}
    </I18nProvider>
  </StrictMode>
);
