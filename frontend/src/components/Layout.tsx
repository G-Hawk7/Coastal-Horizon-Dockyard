import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Anchor, LogOut, Shield, Ship, UserCircle, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/berths" className="brand">
            <span className="brand-icon">
              <Anchor size={19} />
            </span>
            <span>Coastal Horizon Dockyard</span>
          </NavLink>

          <nav className="nav-links" aria-label="Main navigation">
            <NavLink
              to="/berths"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Ship size={16} />
              <span>Berths</span>
            </NavLink>

            <NavLink
              to="/groups"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Users size={16} />
              <span>Groups</span>
            </NavLink>

            <NavLink
              to="/profile"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <UserCircle size={16} />
              <span>Profile</span>
            </NavLink>

            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <Shield size={16} />
                <span>Admin</span>
              </NavLink>
            )}
          </nav>

          <div className="user-menu">
            {user && (
              <div className="user-pill">
                <span>{user.full_name}</span>
                <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                  {user.role.toUpperCase()}
                </span>
              </div>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}