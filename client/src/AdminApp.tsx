import { useState } from 'react';
import { getStoredAdminSecret } from './services/adminService';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLogin } from './components/admin/AdminLogin';

export function AdminApp() {
  const [secret, setSecret] = useState<string | null>(() => getStoredAdminSecret());

  return (
    <div className="app admin-app">
      {!secret ? (
        <AdminLogin onAuthenticated={setSecret} />
      ) : (
        <AdminDashboard secret={secret} onLogout={() => setSecret(null)} />
      )}
    </div>
  );
}
