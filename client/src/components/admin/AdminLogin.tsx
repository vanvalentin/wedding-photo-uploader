import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  storeAdminSecret,
  verifyAdminAccess,
} from '../../services/adminService';

interface AdminLoginProps {
  onAuthenticated: (secret: string) => void;
}

export function AdminLogin({ onAuthenticated }: AdminLoginProps) {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const trimmed = secret.trim();
    if (!trimmed) {
      setError('Enter the admin password');
      setLoading(false);
      return;
    }

    const ok = await verifyAdminAccess(trimmed);
    if (!ok) {
      setError('Invalid admin password');
      setLoading(false);
      return;
    }

    storeAdminSecret(trimmed);
    onAuthenticated(trimmed);
  };

  return (
    <div className="admin-login">
      <h1>Gallery Admin</h1>
      <p className="admin-login-subtitle">Sign in to curate wedding highlights</p>

      <form className="admin-login-form" onSubmit={handleSubmit}>
        <label className="guest-name-label" htmlFor="admin-secret">
          Admin password
        </label>
        <input
          id="admin-secret"
          type="password"
          className="guest-name-input"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          autoComplete="current-password"
          disabled={loading}
        />

        {error && <p className="admin-error">{error}</p>}

        <button type="submit" className="upload-button admin-login-button" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <a href="/" className="admin-back-link">
        ← Back to upload page
      </a>
    </div>
  );
}
