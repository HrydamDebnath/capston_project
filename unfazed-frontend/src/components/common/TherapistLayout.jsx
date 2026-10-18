import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Logo from './Logo.jsx';
import Avatar from './Avatar.jsx';
import UpgradeModal from './UpgradeModal.jsx';

const icons = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  clients: 'M16 11a4 4 0 1 0-8 0M4 20a8 8 0 0 1 16 0',
  schedule: 'M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  notes: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  analytics: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
};

const links = [
  { to: '/dashboard', label: 'Overview', icon: 'home', end: true },
  { to: '/dashboard/schedule', label: 'Schedule', icon: 'schedule' },
  { to: '/dashboard/clients', label: 'Clients', icon: 'clients' },
  { to: '/dashboard/notes', label: 'Notes', icon: 'notes' },
  { to: '/dashboard/analytics', label: 'Analytics', icon: 'analytics' },
  { to: '/dashboard/settings', label: 'Settings', icon: 'settings' },
];

function Icon({ name }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={icons[name]} />
    </svg>
  );
}

export default function TherapistLayout() {
  const { therapist, entitlements, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const signOut = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-night px-4 py-6 text-white">
      <div className="px-2"><Logo to="/dashboard" light /></div>
      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-white text-ink' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
            }
          >
            <Icon name={link.icon} />
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="rounded-2xl bg-white/10 p-3">
        <div className="flex items-center gap-3">
          <Avatar name={therapist.name} src={therapist.photoUrl} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{therapist.name}</p>
            <p className="truncate text-xs text-white/60">{entitlements ? `${entitlements.tier.name} plan` : ''}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={`/${therapist.slug}`} target="_blank" rel="noreferrer" className="rounded-lg bg-white/10 px-2 py-1.5 text-center text-xs font-semibold hover:bg-white/20">View page</a>
          <button type="button" onClick={signOut} className="rounded-lg bg-white/10 px-2 py-1.5 text-xs font-semibold hover:bg-white/20">Sign out</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>

      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <Logo to="/dashboard" />
        <button type="button" onClick={() => setMenuOpen(true)} className="rounded-lg p-2 hover:bg-mist" aria-label="Open menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-night/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">{sidebar}</div>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-9">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
      <UpgradeModal />
    </div>
  );
}
