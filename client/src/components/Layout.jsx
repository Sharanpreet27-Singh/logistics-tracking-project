import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MapPin, Truck, Users, Package, Route as RouteIcon, BarChart3, Bell, LogOut, Menu, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { getSocket } from '../services/socket.js';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tracking', label: 'Live tracking', icon: MapPin },
  { to: '/vehicles', label: 'Vehicles', icon: Truck },
  { to: '/drivers', label: 'Drivers', icon: Users },
  { to: '/shipments', label: 'Shipments', icon: Package },
  { to: '/routes', label: 'Routes', icon: RouteIcon },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager'] },
  { to: '/alerts', label: 'Alerts', icon: Bell },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const refreshCount = () => api.get('/alerts?isRead=false&limit=1').then((r) => setUnread(r.data.meta.total)).catch(() => {});
    refreshCount();
    const socket = getSocket();
    const onAlert = (a) => {
      setUnread((n) => n + 1);
      toast(a.message, { icon: a.severity === 'critical' ? '🚨' : '⚠️' });
    };
    socket.on('alert:new', onAlert);
    window.addEventListener('alerts:changed', refreshCount);
    return () => {
      socket.off('alert:new', onAlert);
      window.removeEventListener('alerts:changed', refreshCount);
    };
  }, []);

  const items = NAV.filter((n) => !n.roles || n.roles.includes(user.role));

  return (
    <div className="flex min-h-screen">
      {open && <div className="fixed inset-0 z-30 bg-asphalt-950/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-asphalt-900 text-white transition-transform lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-lane text-asphalt-950"><Truck size={20} /></span>
            <div className="leading-tight">
              <p className="font-display text-lg font-bold">FleetTrack</p>
              <p className="text-xs text-white/60">Logistics control</p>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-lane text-asphalt-950' : 'text-white/75 hover:bg-asphalt-700 hover:text-white'}`
              }
            >
              <Icon size={18} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {to === '/alerts' && unread > 0 && <span className="rounded-full bg-stop px-1.5 text-xs font-bold text-white">{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <NavLink to="/track" className="mb-3 flex items-center gap-2 text-sm text-white/70 hover:text-white"><Search size={16} /> Public tracking page</NavLink>
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="mb-3 text-xs capitalize text-white/60">{user.role}</p>
          <button className="btn w-full bg-asphalt-700 text-white hover:bg-asphalt-600" onClick={() => { logout(); navigate('/login'); }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-concrete-dark bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <span className="font-display text-lg font-bold">FleetTrack</span>
        </header>
        <main className="flex-1 p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
