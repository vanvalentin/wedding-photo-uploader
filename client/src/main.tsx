import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AdminApp } from './AdminApp';
import { PrivateAlbumApp } from './PrivateAlbumApp';
import { HighlightsPage } from './components/HighlightsPage';
import { GalleryPage } from './components/GalleryPage';
import { I18nProvider } from './i18n/I18nContext';
import './index.css';

const pathname = window.location.pathname;
const isAdminRoute = pathname.startsWith('/admin');
const isHighlightsRoute = pathname.startsWith('/highlights');
const isGalleryRoute = pathname.startsWith('/gallery');
const isAlbumRoute = pathname.startsWith('/album/');

function RootApp() {
  if (isAdminRoute) return <AdminApp />;
  if (isAlbumRoute) return <PrivateAlbumApp />;
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
