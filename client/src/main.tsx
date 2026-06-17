import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AdminApp } from './AdminApp';
import { HighlightsPage } from './components/HighlightsPage';
import { GalleryPage } from './components/GalleryPage';
import { I18nProvider } from './i18n/I18nContext';
import './index.css';

const pathname = window.location.pathname;
const isAdminRoute = pathname.startsWith('/admin');
const isHighlightsRoute = pathname.startsWith('/highlights');
const isGalleryRoute = pathname.startsWith('/gallery');

function RootApp() {
  if (isAdminRoute) return <AdminApp />;
  if (isHighlightsRoute) return <HighlightsPage />;
  if (isGalleryRoute) return <GalleryPage />;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <RootApp />
    </I18nProvider>
  </StrictMode>
);
