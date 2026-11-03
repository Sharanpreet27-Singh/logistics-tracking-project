import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Spinner from '../components/Spinner.jsx';
import { timeAgo } from '../utils/helpers.js';
import { getSocket } from '../services/socket.js';

const TYPE_LABEL = { speeding: 'Speeding', delayed: 'Delayed', delivery_failed: 'Delivery failed', idle: 'Long idle', maintenance: 'Maintenance', document_expiry: 'Document expiry' };

export default function Alerts() {
  const [alerts, setAlerts] = useState(null);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const load = useCallback(() => {
    api.get(`/alerts?limit=100${onlyUnread ? '&isRead=false' : ''}`).then((r) => setAlerts(r.data.data)).catch((e) => toast.error(errorMessage(e)));
  }, [onlyUnread]);

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('alert:new', load);
    return () => socket.off('alert:new', load);
  }, [load]);

  const changed = () => window.dispatchEvent(new Event('alerts:changed'));
  const markRead = async (id) => { await api.patch(`/alerts/${id}/read`); load(); changed(); };
  const markAll = async () => { await api.patch('/alerts/read-all'); load(); changed(); toast.success('All alerts marked as read'); };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Alerts</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyUnread} onChange={(e) => setOnlyUnread(e.target.checked)} /> Unread only</label>
          <button className="btn btn-secondary" onClick={markAll}>Mark all as read</button>
        </div>
      </div>
      {!alerts ? <Spinner /> : alerts.length === 0 ? (
        <p className="panel px-4 py-12 text-center text-sm text-steel">No alerts. Speeding, failed deliveries and expiring documents will show up here.</p>
      ) : (
        <ul className="panel divide-y divide-concrete">
          {alerts.map((a) => (
            <li key={a._id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${a.isRead ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3">
                <StatusBadge status={a.severity} />
                <div>
                  <p className="text-sm font-semibold">{TYPE_LABEL[a.type] || a.type}</p>
                  <p className="text-sm text-steel">{a.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-steel">
                {timeAgo(a.createdAt)}
                {!a.isRead && <button className="btn btn-secondary btn-sm" onClick={() => markRead(a._id)}>Mark as read</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
