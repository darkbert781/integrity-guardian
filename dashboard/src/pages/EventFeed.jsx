import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { Activity, Search, Filter, FileText, ChevronRight, Hash, Clock, Box } from 'lucide-react';

export function EventFeed() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const fetchEvents = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: 100 });
    if (filterSeverity !== 'ALL') params.append('severity', filterSeverity);
    
    api.get(`/events?${params.toString()}`)
      .then(r => setEvents(r.data.data || []))
      .finally(() => setLoading(false));
  }, [filterSeverity]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const filtered = events.filter(e => 
    !search || e.file_path?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-6 flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-bold text-textMain tracking-tight">Event Feed</h2>
            <p className="text-sm text-textMuted mt-1">Real-time file integrity monitoring events</p>
          </div>
          
          <div className="flex items-center justify-between bg-white border border-border p-3 rounded shadow-sm">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-textMuted" />
              <input
                className="bg-transparent border-none outline-none text-sm w-full max-w-md text-textMain placeholder-textMuted"
                placeholder="Search by file path..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 border-l border-border pl-4 ml-4">
              <Filter className="w-4 h-4 text-textMuted" />
              {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map(sev => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider transition-colors ${
                    filterSeverity === sev 
                      ? 'bg-primary text-white' 
                      : 'bg-[#f1f5f9] text-textMuted hover:bg-[#e2e8f0]'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 enterprise-card overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-50">
              <FileText className="w-12 h-12 text-textMuted mb-2" />
              <p className="text-sm font-semibold text-textMain">No events found</p>
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th className="w-10"></th>
                    <th>Path</th>
                    <th>Event Type</th>
                    <th>Severity</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, idx) => (
                    <tr 
                      key={e.id || idx} 
                      onClick={() => setSelected(e)}
                      className={`cursor-pointer ${selected?.id === e.id ? 'bg-[#f1f5f9]' : ''}`}
                    >
                      <td className="text-center">
                        <FileText className="w-4 h-4 text-textMuted inline-block" />
                      </td>
                      <td className="font-mono text-xs">{e.file_path}</td>
                      <td className="text-xs font-semibold">{e.event_type}</td>
                      <td><SeverityBadge severity={e.severity} /></td>
                      <td className="text-xs text-textMuted whitespace-nowrap">{new Date(e.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="w-80 enterprise-card p-0 flex flex-col flex-shrink-0 animate-in slide-in-from-right-4 duration-200">
          <div className="p-4 border-b border-border bg-[#f8f9fa] flex items-center justify-between">
            <h3 className="text-sm font-bold text-textMain">Event Details</h3>
            <button onClick={() => setSelected(null)} className="text-textMuted hover:text-textMain">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-5 flex flex-col gap-6 overflow-y-auto">
            <div>
              <SeverityBadge severity={selected.severity} />
              <p className="font-mono text-xs break-all mt-3 text-textMain bg-[#f1f5f9] p-3 rounded border border-border">
                {selected.file_path}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Activity className="w-4 h-4 text-textMuted mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1">Event Type</p>
                  <p className="text-sm font-semibold text-textMain">{selected.event_type}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-textMuted mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1">Timestamp</p>
                  <p className="text-sm text-textMain">{new Date(selected.timestamp).toLocaleString()}</p>
                </div>
              </div>

              {selected.process_name && (
                <div className="flex items-start gap-3">
                  <Box className="w-4 h-4 text-textMuted mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1">Originating Process</p>
                    <p className="text-sm text-textMain">{selected.process_name} <span className="text-xs text-textMuted">(PID: {selected.pid})</span></p>
                  </div>
                </div>
              )}

              {selected.file_hash && (
                <div className="flex items-start gap-3">
                  <Hash className="w-4 h-4 text-textMuted mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1">SHA-256 Hash</p>
                    <p className="font-mono text-[10px] break-all text-textMain bg-[#f1f5f9] p-2 rounded border border-border">
                      {selected.file_hash}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
