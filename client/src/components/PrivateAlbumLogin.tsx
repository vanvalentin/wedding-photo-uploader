import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import {
  accessPrivateAlbum,
  clearAlbumPassword,
  fetchAlbumInfo,
  getStoredAlbumPassword,
  storeAlbumPassword,
} from '../services/privateAlbumService';

interface PrivateAlbumLoginProps {
  slug: string;
  onAuthenticated: () => void;
}

export function PrivateAlbumLogin({ slug, onAuthenticated }: PrivateAlbumLoginProps) {
  const [title, setTitle] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInfo() {
      setLoading(true);
      setError(null);

      try {
        const info = await fetchAlbumInfo(slug);
        if (cancelled) return;

        if (!info) {
          setNotFound(true);
          return;
        }

        setTitle(info.title);

        const stored = getStoredAlbumPassword(slug);
        if (stored) {
          try {
            await accessPrivateAlbum(slug, stored);
            if (!cancelled) onAuthenticated();
            return;
          } catch {
            clearAlbumPassword(slug);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load album');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInfo();
    return () => {
      cancelled = true;
    };
  }, [slug, onAuthenticated]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const trimmed = password.trim();
    if (!trimmed) {
      setError('Enter the password');
      setSubmitting(false);
      return;
    }

    try {
      await accessPrivateAlbum(slug, trimmed);
      storeAlbumPassword(slug, trimmed);
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid password');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-login">
        <p className="admin-login-subtitle">Loading…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="admin-login">
        <h1>Album not found</h1>
        <p className="admin-login-subtitle">This link may be incorrect or the album was removed.</p>
        <a href="/" className="admin-back-link">
          ← Back to home
        </a>
      </div>
    );
  }

  return (
    <div className="admin-login">
      <h1>{title ?? 'Your Photos'}</h1>
      <p className="admin-login-subtitle">Enter your password to view your photos</p>

      <form className="admin-login-form" onSubmit={handleSubmit}>
        <label className="guest-name-label" htmlFor="album-password">
          Password
        </label>
        <input
          id="album-password"
          type="password"
          className="guest-name-input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          disabled={submitting}
          autoFocus
        />

        {error && <p className="admin-error">{error}</p>}

        <button type="submit" className="upload-button admin-login-button" disabled={submitting}>
          {submitting ? 'Opening…' : 'View photos'}
        </button>
      </form>
    </div>
  );
}
