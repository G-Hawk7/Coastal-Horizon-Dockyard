import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="loading-screen">
        <p>Restoring your dockyard session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { isAuthenticated, isAdmin, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="loading-screen">
        <p>Verifying administrator access...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return (
      <div className="main-content">
        <div className="card">
          <div className="card-body empty-state">
            <ShieldAlert size={44} color="#dc2626" style={{ marginBottom: 12 }} />
            <h2 style={{ margin: '0 0 8px', color: '#0f172a' }}>403 — Access Denied</h2>
            <p className="muted" style={{ marginBottom: 18 }}>
              Administrator privileges are required to view the Admin Dashboard.
            </p>
            <Link to="/berths" className="btn btn-primary">
              Return to Berths
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export function GuestOnlyRoute() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="loading-screen">
        <p>Loading Coastal Horizon Dockyard...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/berths" replace />;
  }

  return <Outlet />;
}