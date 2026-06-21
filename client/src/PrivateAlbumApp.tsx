import { parseAlbumSlugFromPath } from './services/privateAlbumService';
import { PrivateAlbumGallery } from './components/PrivateAlbumGallery';

export function PrivateAlbumApp() {
  const slug = parseAlbumSlugFromPath(window.location.pathname);

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

  return <PrivateAlbumGallery slug={slug} />;
}
