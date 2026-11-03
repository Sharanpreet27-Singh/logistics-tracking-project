import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from './Modal.jsx';
import Spinner from './Spinner.jsx';

/**
 * Generic list + create/edit/delete screen.
 * fields: [{ name, label, type: 'text'|'number'|'date'|'select'|'email', options?, required? }]
 * columns: [{ key, label, render?(row) }]
 */
export default function CrudPage({ title, noun, endpoint, columns, fields, filterOptions, filterKey = 'status' }) {
  const { user } = useAuth();
  const canEdit = ['admin', 'manager'].includes(user.role);
  const canDelete = user.role === 'admin';
  const [rows, setRows] = useState([]);
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
    fields.forEach((f) => {
      if (form[f.name] !== '' && form[f.name] !== undefined) body[f.name] = f.type === 'number' ? Number(form[f.name]) : form[f.name];
    });
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
    if (!window.confirm(`Delete this ${noun.toLowerCase()}? This cannot be undone.`)) return;
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {canEdit && <button className="btn btn-primary" onClick={() => openForm()}><Plus size={16} /> Add {noun.toLowerCase()}</button>}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-2.5 text-steel" aria-hidden="true" />
          <input className="input pl-9" placeholder={`Search ${title.toLowerCase()}`} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        </div>
        {filterOptions && (
          <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter">
            <option value="">All {filterKey}</option>
            {filterOptions.map((o) => <option key={o}>{o}</option>)}
          </select>
        )}
      </div>

      <div className="panel overflow-x-auto">
        {loading ? <Spinner /> : rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-steel">No {title.toLowerCase()} found.{canEdit && ` Add your first ${noun.toLowerCase()} to get started.`}</p>
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
                <tr key={row._id} className="hover:bg-concrete/40">
                  {columns.map((c) => <td key={c.key} className="td">{c.render ? c.render(row) : row[c.key] ?? '-'}</td>)}
                  {(canEdit || canDelete) && (
                    <td className="td whitespace-nowrap text-right">
                      {canEdit && <button className="btn btn-secondary btn-sm mr-1" onClick={() => openForm(row)} aria-label="Edit"><Pencil size={14} /></button>}
                      {canDelete && <button className="btn btn-secondary btn-sm text-stop" onClick={() => remove(row)} aria-label="Delete"><Trash2 size={14} /></button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={`${editing._id ? 'Edit' : 'Add'} ${noun.toLowerCase()}`} onClose={() => setEditing(null)} wide>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="label" htmlFor={f.name}>{f.label}</label>
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
                    value={form[f.name]}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
