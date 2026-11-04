import { useCallback, useEffect, useState } from 'react';
import { Gauge, PackageX, FileWarning, Clock, Wrench, Bell, CheckCheck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Spinner from '../components/Spinner.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { timeAgo } from '../utils/helpers.js';
import { getSocket } from '../services/socket.js';

const TYPES = {
  speeding: { label: 'Speeding', icon: Gauge, why: 'A vehicle went over 80 km/h.' },
  delayed: { label: 'Delayed', icon: Clock, why: 'A shipment is running behind its ETA.' },
  delivery_failed: { label: 'Delivery failed', icon: PackageX, why: 'A driver could not complete a delivery.' },
  idle: { label: 'Long idle', icon: Clock, why: 'A vehicle has not moved for a while.' },
  maintenance: { label: 'Maintenance', icon: Wrench, why: 'A vehicle is due for service.' },
  document_expiry: { label: 'Document expiry', icon: FileWarning, why: 'Insurance or a licence is about to expire.' },
};
const SEVERITY_BG = { info: 'bg-sky-soft text-sky', warning: 'bg-sun-soft text-sun-dark', critical: 'bg-ember-soft text-ember' };

export default function Alerts() {
  const [alerts, setAlerts] = useState(null);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [pending, setPending] = useState(0); // alerts that arrived since the list was loaded

  const load = useCallback(() => {
    setPending(0);
    api.get(`/alerts?limit=100${onlyUnread ? '&isRead=false' : ''}`).then((r) => setAlerts(r.data.data)).catch((e) => toast.error(errorMessage(e)));
  }, [onlyUnread]);

  useEffect(() => {
    load();
    // New alerts are not inserted automatically: the list would shift under the cursor mid-click.
    const socket = getSocket();
    const onNew = () => setPending((n) => n + 1);
    socket.on('alert:new', onNew);
    return () => socket.off('alert:new', onNew);
  }, [load]);

  const changed = () => window.dispatchEvent(new Event('alerts:changed'));
  const markRead = async (id) => {
    // Update the row in place so nothing moves while the request is in flight.
    setAlerts((list) => list.map((a) => (a._id === id ? { ...a, isRead: true } : a)));
    try {
      await api.patch(`/alerts/${id}/read`);
      changed();
      if (onlyUnread) setAlerts((list) => list.filter((a) => a._id !== id));
    } catch (e) {
      toast.error(errorMessage(e));
      setAlerts((list) => list.map((a) => (a._id === id ? { ...a, isRead: false } : a)));
    }
  };
  const markAll = async () => {
    try {
      await api.patch('/alerts/read-all');
      changed();
      toast.success('All alerts marked as read');
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const unread = alerts?.filter((a) => !a.isRead).length || 0;

  return (
    <div>
      <PageHeader title="Alerts" subtitle="Things that need a human: speeding, failed deliveries and expiring documents. New alerts also pop up as notifications.">
        <label className="chip cursor-pointer bg-white py-2"><input type="checkbox" className="mr-1" checked={onlyUnread} onChange={(e) => setOnlyUnread(e.target.checked)} /> Unread only</label>
        <button className="btn btn-secondary" onClick={markAll} disabled={!unread}><CheckCheck size={16} /> Mark all as read</button>
      </PageHeader>

      {pending > 0 && (
        <button className="btn btn-primary mb-4 w-full sm:w-auto" onClick={load}>
          <RefreshCw size={15} /> Show {pending} new alert{pending === 1 ? '' : 's'}
        </button>
      )}

      {!alerts ? <Spinner /> : alerts.length === 0 ? (
        <div className="card px-4 py-16 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-leaf-soft text-leaf"><Bell size={22} /></span>
          <p className="font-semibold">All clear</p>
          <p className="mt-1 text-sm text-ink-soft">{onlyUnread ? 'No unread alerts.' : 'Speeding, failed deliveries and expiring documents will show up here.'}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => {
            const t = TYPES[a.type] || { label: a.type, icon: Bell, why: '' };
            const Icon = t.icon;
            return (
              <li key={a._id} className={`card flex flex-wrap items-center gap-4 px-5 py-4 transition-opacity ${a.isRead ? 'opacity-60' : ''}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${SEVERITY_BG[a.severity] || SEVERITY_BG.warning}`}><Icon size={20} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{t.label}</p>
                    <StatusBadge status={a.severity} />
                    {!a.isRead && <span className="chip bg-sun-soft text-sun-dark">New</span>}
                  </div>
                  <p className="mt-0.5 text-sm">{a.message}</p>
                  <p className="help mt-0.5">{t.why} {a.vehicle?.registrationNo && `Vehicle ${a.vehicle.registrationNo}.`}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-soft">
                  {timeAgo(a.createdAt)}
                  {!a.isRead && <button className="btn btn-secondary btn-sm" onClick={() => markRead(a._id)}>Mark as read</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
