import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, Moon, Navigation, Siren, Sun, Users, X } from 'lucide-react';
import { Logo } from '../components/Brand.jsx';
import { Avatar } from '../components/ui.jsx';
import { NAV_ITEMS } from '../data/navigation.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { emergencyService } from '../services/index.js';

function NavList({ onNavigate }) {
  return (
    <nav aria-label="Main">
      <ul className="nav-list">
        {NAV_ITEMS.map(({ to, label, icon: Icon, danger }) => (
          <li key={to}>
            <NavLink to={to} onClick={onNavigate} className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''} ${danger ? 'nav-link--danger' : ''}`}>
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { settings, update } = useSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSos, setActiveSos] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
    emergencyService.getActive().then(setActiveSos).catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', drawerOpen);
    if (!drawerOpen) return;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const toggleTheme = () => update({ theme: settings.theme === 'dark' ? 'light' : 'dark' }).catch(() => {});
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userBlock = (
    <div className="sidebar__user">
      <Link to="/profile" className="sidebar__user-link">
        <Avatar name={user?.name} photo={user?.photo} size={38} />
        <span className="sidebar__user-text">
          <strong>{user?.name}</strong>
          <small>{user?.email}</small>
        </span>
      </Link>
      <button className="icon-btn" onClick={handleLogout} aria-label="Log out" title="Log out">
        <LogOut size={18} />
      </button>
    </div>
  );

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <aside className="sidebar" aria-label="Sidebar">
        <div className="sidebar__top">
          <Logo to="/dashboard" />
          <button className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} theme`}>
            {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <NavList />
        <div className="sidebar__bottom">
          <div className="sidebar__status">
            <span className="pill__dot pill__dot--pulse" aria-hidden="true" />
            Protection active
          </div>
          {userBlock}
        </div>
      </aside>

      <header className="topbar">
        <Logo to="/dashboard" />
        <div className="topbar__actions">
          <button className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} theme`}>
            {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="icon-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu" aria-expanded={drawerOpen}>
            <Menu size={20} />
          </button>
        </div>
      </header>

      {drawerOpen && (
        <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setDrawerOpen(false)}>
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="sidebar__top">
              <Logo to="/dashboard" />
              <button className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            <NavList onNavigate={() => setDrawerOpen(false)} />
            <div className="sidebar__bottom">{userBlock}</div>
          </div>
        </div>
      )}

      <main id="main" className="main" tabIndex={-1}>
        {activeSos && location.pathname !== '/emergency' && (
          <Link to="/emergency" className="sos-banner" role="alert">
            <Siren size={18} aria-hidden="true" />
            <span>
              <strong>Emergency mode is active.</strong> Tap to view or mark yourself safe.
            </span>
          </Link>
        )}
        <div className="page-transition" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Quick navigation">
        <NavLink to="/dashboard" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
          <LayoutDashboard size={21} aria-hidden="true" />
          <span>Home</span>
        </NavLink>
        <NavLink to="/journey" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
          <Navigation size={21} aria-hidden="true" />
          <span>Journey</span>
        </NavLink>
        <NavLink to="/emergency" className="bottom-nav__sos" aria-label="Emergency SOS">
          <span>SOS</span>
        </NavLink>
        <NavLink to="/contacts" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
          <Users size={21} aria-hidden="true" />
          <span>Contacts</span>
        </NavLink>
        <button className="bottom-nav__item" onClick={() => setDrawerOpen(true)} aria-label="More pages">
          <Menu size={21} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
