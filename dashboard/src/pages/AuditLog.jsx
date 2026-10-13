import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { Search, Clock, FileText, Database, Download } from 'lucide-react';

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return isNaN(d) ? ts : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
}

export function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(() => {
    setLoading(true);
    api.get('/events?limit=200')
      .then(r => setLogs(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(e =>
    !search || e.file_path?.toLowerCase().includes(search.toLowerCase())
             || e.event_type?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const csvRows = [];
    csvRows.push(['Timestamp', 'Event Type', 'File Path', 'Process Name', 'PID'].join(','));
    for (const e of filtered) {
      csvRows.push([
        e.timestamp || '',
        e.event_type || '',
        `"${(e.file_path || '').replace(/"/g, '""')}"`,
        e.process_name || '',
        e.pid || ''
      ].join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'audit_logs.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-full gap-8 max-w-6xl mx-auto w-full animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-textMain tracking-tight">Audit Log</h2>
          <p className="text-sm text-textMuted mt-2">Complete chronological system event ledger.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-surface border border-borderHighlight rounded-lg px-4 py-2.5 w-80 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <Search className="w-4 h-4 text-primary" />
            <input
              className="bg-transparent border-none outline-none text-sm w-full text-textMain placeholder-textMuted/50 font-mono"
              placeholder="Filter by path or event..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-primary/10 border border-primary/30 px-4 py-2.5 rounded-lg text-sm font-bold text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex-1 enterprise-card overflow-hidden flex flex-col border border-borderHighlight shadow-md bg-surface">
        <div className="p-5 border-b border-borderHighlight bg-surfaceHighlight flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm font-bold text-textMain uppercase tracking-widest">
            <div className="p-2 bg-primary/10 rounded-md border border-primary/20">
              <Database className="w-4 h-4 text-primary" />
            </div>
            Raw Event Ledger
          </div>
          <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">{filtered.length} Entries</span>
        </div>

        <div className="flex-1 overflow-auto p-0 bg-surface">
          {loading ? (
             <div className="flex flex-col items-center justify-center p-20 gap-4">
               <Clock className="w-8 h-8 text-primary animate-spin" />
               <p className="text-sm font-mono text-textMuted">Querying ledger database...</p>
             </div>
          ) : filtered.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-24 text-center">
               <div className="p-4 bg-surfaceHighlight rounded-full mb-6 border border-borderHighlight shadow-sm">
                 <FileText className="w-12 h-12 text-textMuted/50" />
               </div>
               <p className="text-sm font-bold text-textMain">{search ? 'No ledger entries match query.' : 'No audit entries recorded.'}</p>
             </div>
          ) : (
            <table className="enterprise-table relative">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th>Timestamp</th>
                  <th>Event Type</th>
                  <th>File Path</th>
                  <th>Process Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="group hover:bg-surfaceHighlight/30 transition-colors">
                    <td className="text-xs text-textMuted whitespace-nowrap font-mono">{fmtDate(e.timestamp)}</td>
                    <td>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-surfaceHighlight/50 border border-borderHighlight text-textMain group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30 transition-colors">
                        {e.event_type}
                      </span>
                    </td>
                    <td className="font-mono text-xs max-w-md truncate text-textMain group-hover:text-primary transition-colors" title={e.file_path}>{e.file_path}</td>
                    <td className="text-xs text-textMuted font-mono">
                      {e.process_name ? `${e.process_name} (PID: ${e.pid})` : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
