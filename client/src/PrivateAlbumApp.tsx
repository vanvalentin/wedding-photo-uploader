import { useState } from 'react';
import { parseAlbumSlugFromPath } from './services/privateAlbumService';
import { PrivateAlbumLogin } from './components/PrivateAlbumLogin';
import { PrivateAlbumGallery } from './components/PrivateAlbumGallery';

export function PrivateAlbumApp() {
  const slug = parseAlbumSlugFromPath(window.location.pathname);
  const [authenticated, setAuthenticated] = useState(false);

  if (!slug) {
    return (
      <div className="app admin-app">
        <div className="admin-login">
          <h1>Invalid album link</h1>
          <p className="admin-login-subtitle">Check the URL you were given and try again.</p>
          <a href="/" className="admin-back-link">
            ← Back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {!authenticated ? (
        <PrivateAlbumLogin slug={slug} onAuthenticated={() => setAuthenticated(true)} />
      ) : (
        <PrivateAlbumGallery slug={slug} onLogout={() => setAuthenticated(false)} />
      )}
    </div>
  );
}
