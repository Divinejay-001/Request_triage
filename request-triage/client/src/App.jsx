import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

const label = (s) => s.replace('_', ' ');
const fmtDate = (d) => new Date(d).toLocaleString();

function ImportReport({ report, onClose }) {
  return (
    <section className="card report">
      <div className="row between">
        <h2>Import report</h2>
        <button className="link" onClick={onClose}>Dismiss</button>
      </div>
      <div className="stats">
        <div><strong>{report.imported}</strong><span>Imported</span></div>
        <div><strong>{report.rejectedCount}</strong><span>Rejected</span></div>
        <div><strong>{report.totalRows}</strong><span>Rows read</span></div>
      </div>
      {report.rejected.length > 0 && (
        <>
          <h3>Rejected rows</h3>
          <ul className="issues">
            {report.rejected.map((r) => (
              <li key={`${r.row}-${r.reason}`}>
                <b>Row {r.row}</b>
                {r.external_id ? ` (${r.external_id})` : ''} — {r.reason}
              </li>
            ))}
          </ul>
        </>
      )}
      {report.warnings?.length > 0 && (
        <>
          <h3>Warnings (rows were imported)</h3>
          <ul className="issues warn">
            {report.warnings.map((w, i) => (
              <li key={i}><b>Row {w.row}</b> — {w.message}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Details({ item, meta, onSave, onClose }) {
  const [status, setStatus] = useState(item.status);
  const [owner, setOwner] = useState(item.owner);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setStatus(item.status);
    setOwner(item.owner);
    setMsg('');
  }, [item]);

  const dirty = status !== item.status || owner !== item.owner;

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      await onSave(item._id, { status, owner });
      setMsg('Saved');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="card details">
      <div className="row between">
        <h2>{item.external_id}</h2>
        <button className="link" onClick={onClose}>Close</button>
      </div>
      <h3>{item.subject}</h3>
      <dl>
        <dt>Requester</dt><dd>{item.requester}</dd>
        <dt>Received</dt><dd>{fmtDate(item.received_at)}</dd>
        <dt>Priority</dt><dd><span className={`pill p-${item.priority}`}>{item.priority}</span></dd>
        <dt>Description</dt><dd className="desc">{item.description || <em>No description</em>}</dd>
      </dl>
      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {meta.statuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
      </label>
      <label>
        Owner
        <select value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">Unassigned</option>
          {meta.owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
      <div className="row">
        <button onClick={save} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        {msg && <span className="msg">{msg}</span>}
      </div>
    </aside>
  );
}

export default function App() {
  const [meta, setMeta] = useState({ statuses: [], owners: [] });
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.list({ q, status }));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    api.meta().then(setMeta).catch((e) => setError(e.message));
  }, []);

  // Debounce search typing; status changes apply immediately via the same effect.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function onFile(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setError('');
    try {
      setReport(await api.importCsv(file));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  async function save(id, body) {
    const updated = await api.update(id, body);
    setItems((prev) => prev.map((i) => (i._id === id ? updated : i)));
  }

  const selected = items.find((i) => i._id === selectedId);

  return (
    <div className="app">
      <header className="row between">
        <h1>Request Triage</h1>
        <div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
          <button onClick={() => fileRef.current.click()} disabled={importing}>
            {importing ? 'Importing…' : 'Import CSV'}
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}
      {report && <ImportReport report={report} onClose={() => setReport(null)} />}

      <div className="layout">
        <section className="card list">
          <div className="filters">
            <input
              type="search"
              placeholder="Search ID, requester, subject, description…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {meta.statuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </div>
          <table>
            <thead>
              <tr><th>ID</th><th>Subject</th><th>Requester</th><th>Priority</th><th>Status</th><th>Owner</th></tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i._id} className={i._id === selectedId ? 'sel' : ''} onClick={() => setSelectedId(i._id)}>
                  <td>{i.external_id}</td>
                  <td>{i.subject}</td>
                  <td>{i.requester}</td>
                  <td><span className={`pill p-${i.priority}`}>{i.priority}</span></td>
                  <td>{label(i.status)}</td>
                  <td>{i.owner || <em>Unassigned</em>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && items.length === 0 && (
            <p className="empty">{q || status ? 'No requests match your filters.' : 'No requests yet — import a CSV to get started.'}</p>
          )}
        </section>
        {selected && <Details item={selected} meta={meta} onSave={save} onClose={() => setSelectedId(null)} />}
      </div>
    </div>
  );
}
