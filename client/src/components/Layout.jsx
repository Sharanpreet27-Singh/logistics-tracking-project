import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MapPin, Truck, Users, Package, Route as RouteIcon, BarChart3, Bell, LogOut, Menu, X, Search, Globe2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { getSocket } from '../services/socket.js';
import Avatar from './Avatar.jsx';

const GROUPS = [
  { title: 'Overview', items: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/tracking', label: 'Live tracking', icon: MapPin },
  ] },
  { title: 'Operations', items: [
    { to: '/shipments', label: 'Shipments', icon: Package },
    { to: '/routes', label: 'Routes', icon: RouteIcon },
    { to: '/vehicles', label: 'Vehicles', icon: Truck },
    { to: '/drivers', label: 'Drivers', icon: Users },
  ] },
  { title: 'Insights', items: [
    { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager'] },
    { to: '/alerts', label: 'Alerts', icon: Bell },
  ] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [live, setLive] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const refreshCount = () => api.get('/alerts?isRead=false&limit=1').then((r) => setUnread(r.data.meta.total)).catch(() => {});
    refreshCount();
    const socket = getSocket();
    setLive(socket.connected);
    const onAlert = (a) => {
      setUnread((n) => n + 1);
      toast(a.message, { icon: a.severity === 'critical' ? '🚨' : '⚠️' });
    };
    const onConnect = () => setLive(true);
    const onDisconnect = () => setLive(false);
    socket.on('alert:new', onAlert);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    window.addEventListener('alerts:changed', refreshCount);
    return () => {
      socket.off('alert:new', onAlert);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      window.removeEventListener('alerts:changed', refreshCount);
    };
  }, []);

  const search = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/shipments?search=${encodeURIComponent(q)}` : '/shipments');
  };

  return (
    <div className="flex min-h-screen">
      {open && <div className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:self-start ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 pb-2 pt-5">
          <button className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 text-left hover:bg-cream" title="Workspace">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sun text-ink"><Truck size={19} /></span>
            <span className="leading-tight">
              <span className="block font-display text-base font-bold">FleetTrack</span>
              <span className="block text-[11px] text-ink-soft">Logistics control</span>
            </span>
            <ChevronDown size={14} className="text-ink-mute" />
          </button>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
          {GROUPS.map((g) => {
            const items = g.items.filter((n) => !n.roles || n.roles.includes(user.role));
            if (!items.length) return null;
            return (
              <div key={g.title}>
                <p className="eyebrow mb-1.5 px-3">{g.title}</p>
                {items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
                    <Icon size={18} aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                    {to === '/alerts' && unread > 0 && <span className="rounded-full bg-ember px-1.5 py-0.5 text-[11px] font-bold text-white">{unread}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
          <div>
            <p className="eyebrow mb-1.5 px-3">Customers</p>
            <NavLink to="/track" className="nav-item"><Globe2 size={18} aria-hidden="true" /> Public tracking page</NavLink>
          </div>
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl bg-cream p-3">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-xs capitalize text-ink-soft">{user.role}</p>
            </div>
            <button className="btn-icon h-9 w-9" onClick={() => { logout(); navigate('/login'); }} aria-label="Sign out" title="Sign out"><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-cream/80 px-4 py-3 backdrop-blur sm:px-6">
          <button className="btn-icon lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <form onSubmit={search} className="relative hidden w-full max-w-md sm:block">
            <Search size={16} className="absolute left-4 top-3 text-ink-mute" aria-hidden="true" />
            <input className="input input-pill pl-10" placeholder="Search tracking ID or customer..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search shipments" />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <span className={`chip ${live ? 'bg-leaf-soft text-leaf' : 'bg-ember-soft text-ember'}`} title={live ? 'Receiving live GPS updates' : 'Trying to reconnect to live updates'}>
              <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-leaf' : 'bg-ember'}`} />
              {live ? 'Live' : 'Reconnecting'}
            </span>
            <NavLink to="/alerts" className="btn-icon relative" aria-label={`Alerts, ${unread} unread`}>
              <Bell size={17} />
              {unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-4 min-w-4 rounded-full bg-ember px-1 text-center text-[10px] font-bold leading-4 text-white">{unread}</span>}
            </NavLink>
            <Avatar name={user.name} size={40} className="border-2 border-white shadow-card" />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
