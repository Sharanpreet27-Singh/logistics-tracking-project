import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';

/**
 * In-app replacement for window.confirm / window.prompt, styled like every other dialog.
 *
 *   const ok = await confirm({ title: 'Cancel this shipment?', message: '...', confirmLabel: 'Cancel shipment', danger: true });
 *   const note = await confirm({ title: 'Why did the delivery fail?', input: { label: 'Reason', required: true } });
 *
 * Resolves with `true` (or the typed text when `input` is set) when confirmed, and `null` when dismissed.
 * <ConfirmHost /> must be mounted once, next to the Toaster.
 */
let listener = null;

export function confirm(options) {
  return new Promise((resolve) => {
    if (!listener) { resolve(null); return; }
    listener({ confirmLabel: 'Confirm', cancelLabel: 'Go back', ...options, resolve });
  });
}

export function ConfirmHost() {
  const [req, setReq] = useState(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    listener = (r) => { setValue(''); setReq(r); };
    return () => { listener = null; };
  }, []);

  if (!req) return null;
  const close = (result) => { req.resolve(result); setReq(null); };
  const submit = (e) => { e.preventDefault(); close(req.input ? value.trim() : true); };

  return (
    <Modal title={req.title} subtitle={req.message} onClose={() => close(null)}>
      <form onSubmit={submit}>
        {req.input && (
          <>
            <label className="label" htmlFor="confirm-input">{req.input.label}</label>
            <input id="confirm-input" className="input" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={req.input.placeholder} required={req.input.required} maxLength={300} />
            {req.input.help && <p className="help mt-1">{req.input.help}</p>}
          </>
        )}
        <div className={`flex justify-end gap-2 ${req.input ? 'mt-5' : ''}`}>
          <button type="button" className="btn btn-secondary" onClick={() => close(null)}>{req.cancelLabel}</button>
          <button className={`btn ${req.danger ? 'btn-danger' : 'btn-dark'}`} autoFocus={!req.input}>{req.confirmLabel}</button>
        </div>
      </form>
    </Modal>
  );
}
