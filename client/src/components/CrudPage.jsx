import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { downloadCSV } from '../utils/helpers.js';
import Modal from './Modal.jsx';
import { confirm } from './Confirm.jsx';
import Spinner from './Spinner.jsx';
import PageHeader from './PageHeader.jsx';

/**
 * Generic list + create/edit/delete screen.
 * fields: [{ name, label, type: 'text'|'number'|'date'|'select'|'email', options?, required?, help? }]
 * columns: [{ key, label, render?(row) }]
 */
export default function CrudPage({ title, subtitle, noun, endpoint, columns, fields, filterOptions, filterKey = 'status', csvRow }) {
  const { user } = useAuth();
  // Mirrors the server: operations staff manage vehicles and drivers; only the driver role is read-only.
  const canEdit = ['admin', 'manager', 'dispatcher'].includes(user.role);
  const canDelete = canEdit;
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(null); // null | {} (new) | row
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (search) params.set('search', search);
      if (filter) params.set(filterKey, filter);
      const { data } = await api.get(`${endpoint}?${params}`);
      setRows(data.data);
      setTotal(data.meta?.total ?? data.data.length);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [endpoint, search, filter, filterKey]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const openForm = (row = {}) => {
    const initial = {};
    fields.forEach((f) => {
      const v = row[f.name];
      initial[f.name] = f.type === 'date' ? (v ? String(v).slice(0, 10) : '') : v ?? (f.type === 'select' ? f.options[0] : '');
    });
    setForm(initial);
    setEditing(row);
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = {};
    for (const f of fields) {
      const raw = form[f.name];
      const value = typeof raw === 'string' ? raw.trim() : raw;
      if (f.required && (value === '' || value === undefined)) return toast.error(`${f.label} is required`);
      if (value !== '' && value !== undefined) body[f.name] = f.type === 'number' ? Number(value) : value;
    }
    setSaving(true);
    try {
      if (editing._id) await api.put(`${endpoint}/${editing._id}`, body);
      else await api.post(endpoint, body);
      toast.success(`${noun} ${editing._id ? 'updated' : 'added'}`);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const name = row.registrationNo || row.name || row.trackingId || `this ${noun.toLowerCase()}`;
    const ok = await confirm({ title: `Delete ${name}?`, message: 'This cannot be undone.', confirmLabel: `Delete ${noun.toLowerCase()}`, cancelLabel: 'Keep it', danger: true });
    if (!ok) return;
    try {
      await api.delete(`${endpoint}/${row._id}`);
      toast.success(`${noun} deleted`);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle}>
        <button className="btn btn-secondary" onClick={() => downloadCSV(`${title.toLowerCase()}.csv`, rows.map(csvRow || ((r) => r)))} disabled={!rows.length}><Download size={16} /> Export CSV</button>
        {canEdit && <button className="btn btn-dark" onClick={() => openForm()}><Plus size={16} /> Add {noun.toLowerCase()}</button>}
      </PageHeader>

      <div className="card">
        <div className="card-head">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-72 max-w-full">
              <Search size={16} className="absolute left-4 top-3 text-ink-mute" aria-hidden="true" />
              <input className="input input-pill pl-10" placeholder={`Search ${title.toLowerCase()}`} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
            </div>
            {filterOptions && (
              <select className="input input-pill w-auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter">
                <option value="">All {filterKey === 'status' ? 'statuses' : filterKey}</option>
                {filterOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
            )}
          </div>
          <span className="text-sm text-ink-soft">{total} {total === 1 ? noun.toLowerCase() : title.toLowerCase()}</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? <Spinner /> : rows.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="font-semibold">No {title.toLowerCase()} found</p>
              <p className="mt-1 text-sm text-ink-soft">{search || filter ? 'Try a different search or filter.' : canEdit ? `Add your first ${noun.toLowerCase()} to get started.` : 'Nothing has been added yet.'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {columns.map((c) => <th key={c.key} className="th">{c.label}</th>)}
                  {(canEdit || canDelete) && <th className="th text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="hover:bg-cream/50">
                    {columns.map((c) => <td key={c.key} className={`td ${c.nowrap ? 'whitespace-nowrap' : ''}`}>{c.render ? c.render(row) : row[c.key] ?? '-'}</td>)}
                    {(canEdit || canDelete) && (
                      <td className="td whitespace-nowrap text-right">
                        {canEdit && <button className="btn-icon mr-1 h-8 w-8" onClick={() => openForm(row)} aria-label="Edit" title="Edit"><Pencil size={14} /></button>}
                        {canDelete && <button className="btn-icon h-8 w-8 text-ember" onClick={() => remove(row)} aria-label="Delete" title="Delete"><Trash2 size={14} /></button>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editing && (
        <Modal title={`${editing._id ? 'Edit' : 'Add'} ${noun.toLowerCase()}`} subtitle={editing._id ? 'Changes are saved immediately.' : `Fill in the details below to add a new ${noun.toLowerCase()}.`} onClose={() => setEditing(null)} wide>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="label" htmlFor={f.name}>{f.label}{f.required && <span className="text-ember"> *</span>}</label>
                {f.type === 'select' ? (
                  <select id={f.name} className="input" value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                    {f.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    id={f.name}
                    className="input"
                    type={f.type || 'text'}
                    step={f.type === 'number' ? 'any' : undefined}
                    required={f.required}
                    pattern={f.pattern}
                    title={f.pattern ? f.help : undefined}
                    placeholder={f.placeholder}
                    value={form[f.name]}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                )}
                {f.help && <p className="help mt-1">{f.help}</p>}
              </div>
            ))}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing._id ? 'Save changes' : `Add ${noun.toLowerCase()}`}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
