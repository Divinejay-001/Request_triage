async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  meta: () => fetch('/api/requests/meta').then(handle),
  list: ({ q, status }) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (status) p.set('status', status);
    return fetch(`/api/requests?${p}`).then(handle);
  },
  update: (id, body) =>
    fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(handle),
  importCsv: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch('/api/requests/import', { method: 'POST', body: fd }).then(handle);
  },
};
