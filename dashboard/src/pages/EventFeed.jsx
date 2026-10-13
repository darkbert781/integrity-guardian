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
    <div className="flex h-full gap-8 animate-fade-in-up">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-8 flex flex-col gap-6">
          <div>
            <h2 className="text-3xl font-bold text-textMain tracking-tight">Event Feed</h2>
            <p className="text-sm text-textMuted mt-2 max-w-xl">Real-time kernel-level file integrity monitoring events. Analyzed instantaneously.</p>
          </div>
          
          <div className="flex items-center justify-between bg-surface border border-borderHighlight p-3 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 flex-1 px-2">
              <Search className="w-5 h-5 text-primary" />
              <input
                className="bg-transparent border-none outline-none text-sm w-full max-w-md text-textMain placeholder-textMuted font-mono"
                placeholder="Search events by file path..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 border-l border-borderHighlight pl-4 ml-4">
              <Filter className="w-4 h-4 text-textMuted" />
              {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map(sev => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wider transition-all duration-300 ${
                    filterSeverity === sev 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'bg-transparent text-textMuted hover:bg-surfaceHighlight hover:text-textMain border border-transparent'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 enterprise-card overflow-hidden flex flex-col border border-borderHighlight bg-surface shadow-md relative">
          {loading ? (
            <div className="flex-1 flex flex-col gap-4 items-center justify-center">
              <Activity className="w-8 h-8 text-primary animate-pulse-slow" />
              <p className="text-sm font-mono text-textMuted">Syncing event stream...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-70">
              <div className="p-6 bg-surfaceHighlight rounded-full border border-borderHighlight mb-4">
                <FileText className="w-10 h-10 text-textMuted" />
              </div>
              <p className="text-lg font-bold text-textMain">No events detected</p>
              <p className="text-sm text-textMuted mt-1">The system is currently quiet.</p>
            </div>
          ) : (
            <div className="overflow-auto flex-1 bg-surface">
              <table className="enterprise-table relative">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="w-12 text-center"></th>
                    <th>Asset Path</th>
                    <th>Event Type</th>
                    <th>Threat Level</th>
                    <th className="text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, idx) => (
                    <tr 
                      key={e.id || idx} 
                      onClick={() => setSelected(e)}
                      className={`cursor-pointer group transition-all duration-200 ${selected?.id === e.id ? 'bg-primary/10 relative z-0' : ''}`}
                    >
                      {/* Active indicator line */}
                      {selected?.id === e.id && (
                        <td className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary p-0 m-0 border-0"></td>
                      )}
                      <td className="text-center relative">
                        <FileText className={`w-4 h-4 inline-block transition-colors ${selected?.id === e.id ? 'text-primary' : 'text-textMuted group-hover:text-textMain'}`} />
                      </td>
                      <td className="font-mono text-xs tracking-tight text-textMain group-hover:text-primary transition-colors">{e.file_path}</td>
                      <td>
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-surfaceHighlight border border-borderHighlight tracking-widest text-textMuted group-hover:text-textMain transition-colors">
                          {e.event_type}
                        </span>
                      </td>
                      <td><SeverityBadge severity={e.severity} /></td>
                      <td className="text-xs text-textMuted whitespace-nowrap text-right font-mono">{new Date(e.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="w-[400px] enterprise-card p-0 flex flex-col flex-shrink-0 animate-in slide-in-from-right-8 duration-300 shadow-lg border-y border-r border-borderHighlight border-l-4 border-l-primary bg-surface relative overflow-hidden">
          {/* Subtle background glow based on severity */}
          <div className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full pointer-events-none opacity-20 ${
            selected.severity === 'CRITICAL' ? 'bg-critical' : selected.severity === 'WARNING' ? 'bg-warning' : 'bg-primary'
          }`}></div>

          <div className="p-5 border-b border-borderHighlight bg-surfaceHighlight flex items-center justify-between relative z-10">
            <h3 className="text-sm font-bold text-textMain tracking-widest uppercase flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Event Analysis
            </h3>
            <button onClick={() => setSelected(null)} className="text-textMuted hover:text-textMain p-1 rounded hover:bg-surface border border-transparent hover:border-borderHighlight transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 flex flex-col gap-8 overflow-y-auto relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <SeverityBadge severity={selected.severity} />
                <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">{new Date(selected.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-2">Target Asset</p>
              <p className="font-mono text-xs break-all text-textMain bg-background p-4 rounded-lg border border-borderHighlight shadow-inner leading-relaxed">
                {selected.file_path}
              </p>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-surfaceHighlight rounded-lg border border-borderHighlight">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1">Trigger Operation</p>
                  <p className="text-sm font-bold text-textMain">{selected.event_type}</p>
                </div>
              </div>

              {selected.process_name && (
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-surfaceHighlight rounded-lg border border-borderHighlight">
                    <Box className="w-4 h-4 text-secondary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1">Originating Process</p>
                    <p className="text-sm font-bold text-textMain">{selected.process_name}</p>
                    <p className="text-xs font-mono text-textMuted mt-1">PID: {selected.pid || selected.process_id}</p>
                  </div>
                </div>
              )}

              {(selected.hash_old || selected.hash_new) && (
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-surfaceHighlight rounded-lg border border-borderHighlight">
                    <Hash className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="w-full">
                    <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-2">Cryptographic Fingerprint</p>
                    {selected.hash_old && (
                      <div className="mb-3">
                        <span className="text-[9px] text-textMuted uppercase font-bold mb-1 block">Previous (Baseline)</span>
                        <p className="font-mono text-[10px] break-all text-textMuted bg-background p-2.5 rounded border border-borderHighlight">
                          {selected.hash_old}
                        </p>
                      </div>
                    )}
                    {selected.hash_new && (
                      <div>
                        <span className="text-[9px] text-primary uppercase font-bold mb-1 block">New (Modified)</span>
                        <p className="font-mono text-[10px] break-all text-textMain bg-primary/5 p-2.5 rounded border border-primary/20 shadow-inner">
                          {selected.hash_new}
                        </p>
                      </div>
                    )}
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
