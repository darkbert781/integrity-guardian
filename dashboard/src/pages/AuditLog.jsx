import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { Search, Clock, FileText, Database } from 'lucide-react';

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

  return (
    <div className="flex flex-col h-full gap-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-textMain tracking-tight">Audit Log</h2>
          <p className="text-sm text-textMuted mt-1">Complete chronological system event record</p>
        </div>
        <div className="flex items-center gap-2 border border-border rounded bg-white px-3 py-2 w-80">
          <Search className="w-4 h-4 text-textMuted" />
          <input
            className="bg-transparent border-none outline-none text-sm w-full text-textMain"
            placeholder="Filter by path or event..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 enterprise-card overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border bg-[#f8f9fa] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-textMain uppercase tracking-wider">
            <Database className="w-4 h-4 text-textMuted" />
            Raw Event Ledger
          </div>
          <span className="text-xs font-bold text-textMuted uppercase tracking-wider">{filtered.length} Entries</span>
        </div>

        <div className="flex-1 overflow-auto p-0">
          {loading ? (
             <div className="flex items-center justify-center p-12">
               <Clock className="w-6 h-6 text-primary animate-spin" />
             </div>
          ) : filtered.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-16 text-center">
               <FileText className="w-12 h-12 text-border mb-4" />
               <p className="text-sm text-textMuted">{search ? 'No entries match your filter.' : 'No audit entries recorded.'}</p>
             </div>
          ) : (
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event Type</th>
                  <th>File Path</th>
                  <th>Process Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td className="text-xs text-textMuted whitespace-nowrap">{fmtDate(e.timestamp)}</td>
                    <td>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-[#f8f9fa] border border-border text-textMain">
                        {e.event_type}
                      </span>
                    </td>
                    <td className="font-mono text-xs max-w-md truncate" title={e.file_path}>{e.file_path}</td>
                    <td className="text-xs text-textMuted">
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
