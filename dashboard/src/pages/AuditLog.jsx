import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

const Icon = ({ d, size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  log:     'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  clock:   'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  filter:  'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
  x:       'M6 18L18 6M6 6l12 12',
};

const EVENT_TYPES = {
  hash_mismatch_critical_tier: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Hash Mismatch' },
  hash_mismatch_standard_tier: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Hash Mismatch' },
  file_deletion_critical:      { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'File Deleted'  },
  attribute_change:            { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', label: 'Attr Change'  },
  permission_change:           { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', label: 'Perm Change'  },
  default:                     { color: '#1E6FBF', bg: 'rgba(30,111,191,0.08)', label: 'Event'        },
};
const typeStyle = (t) => EVENT_TYPES[t] || EVENT_TYPES.default;

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return isNaN(d) ? ts : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
}

function fmtRelative(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts);
  if (isNaN(diff)) return '';
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

export function AuditLog() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

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
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={S.iconWrap}><Icon d={ICONS.log} size={20} color="#1E6FBF" /></div>
          <div>
            <h2 style={S.title}>Audit Log</h2>
            <p style={S.subtitle}>{logs.length} entries · complete chronological event record</p>
          </div>
        </div>
        <button onClick={fetchLogs} style={S.refreshBtn} title="Refresh">
          <Icon d={ICONS.refresh} size={14} color="#94a3b8" />
        </button>
      </div>

      {/* Search */}
      <div style={S.searchWrap}>
        <Icon d={ICONS.filter} size={13} color="#475569" />
        <input style={S.searchInput} placeholder="Filter by path or event type…"
               value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} style={S.iconBtn}><Icon d={ICONS.x} size={12} color="#64748b" /></button>}
        <span style={{ fontSize:11, color:'#334155', whiteSpace:'nowrap' }}>{filtered.length} shown</span>
      </div>

      {/* Timeline */}
      <div style={S.timeline}>
        {loading ? (
          <div style={S.empty}>
            <div style={S.dots}>{[0,1,2].map(i => <div key={i} style={{ ...S.dot, animationDelay:`${i*0.2}s` }} />)}</div>
            <p style={{ color:'#475569', marginTop:12 }}>Loading audit log…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>
            <Icon d={ICONS.log} size={32} color="#1e3a5f" />
            <p style={{ color:'#334155', marginTop:10 }}>{search ? 'No entries match your filter.' : 'No audit entries recorded.'}</p>
          </div>
        ) : (
          <div style={{ position:'relative' }}>
            {/* vertical line */}
            <div style={{ position:'absolute', left:19, top:0, bottom:0, width:2, background:'rgba(30,111,191,0.12)', borderRadius:1 }} />
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {filtered.map((e, idx) => {
                const ts = typeStyle(e.event_type);
                return (
                  <div key={e.id}
                       style={{ display:'flex', gap:0, alignItems:'flex-start', animationDelay:`${idx*25}ms` }}
                       className="audit-row">
                    {/* dot */}
                    <div style={{ width:40, display:'flex', justifyContent:'center', paddingTop:14, flexShrink:0 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:ts.color,
                                    boxShadow:`0 0 6px ${ts.color}55`, border:`2px solid ${ts.color}33`, flexShrink:0 }} />
                    </div>
                    {/* card */}
                    <div style={{ flex:1, margin:'6px 0', background:ts.bg, border:`1px solid ${ts.color}22`,
                                  borderRadius:10, padding:'10px 14px', transition:'border-color .15s' }}
                         className="audit-card">
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:ts.color, textTransform:'uppercase',
                                       letterSpacing:'0.06em', borderRadius:20, padding:'1px 8px',
                                       background:`${ts.color}18`, border:`1px solid ${ts.color}33` }}>
                          {ts.label}
                        </span>
                        <span style={{ fontSize:10, color:'#334155', marginLeft:'auto', display:'flex', alignItems:'center', gap:4 }}>
                          <Icon d={ICONS.clock} size={10} color="#334155" />
                          {fmtDate(e.timestamp)}
                        </span>
                        <span style={{ fontSize:10, color:'#475569' }}>{fmtRelative(e.timestamp)}</span>
                      </div>
                      <p style={{ margin:0, fontFamily:'monospace', fontSize:12, color:'#94a3b8',
                                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {e.file_path}
                      </p>
                      {e.process_name && (
                        <p style={{ margin:'4px 0 0', fontSize:11, color:'#475569' }}>
                          Process: <span style={{ color:'#64748b' }}>{e.process_name}</span>
                          {e.pid ? ` (PID ${e.pid})` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes dotP { 0%,80%,100%{transform:scale(0);opacity:.3;} 40%{transform:scale(1);opacity:1;} }
        @keyframes auditIn { from{opacity:0;transform:translateX(-6px);} to{opacity:1;transform:translateX(0);} }
        .audit-row { animation: auditIn 0.25s ease-out both; }
        .audit-card:hover { border-color: rgba(30,111,191,0.3) !important; }
      `}</style>
    </div>
  );
}

const S = {
  page:       { display:'flex', flexDirection:'column', height:'100%', gap:0 },
  header:     { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 },
  iconWrap:   { width:40, height:40, borderRadius:10, background:'rgba(30,111,191,0.12)', border:'1px solid rgba(30,111,191,0.22)', display:'flex', alignItems:'center', justifyContent:'center' },
  title:      { margin:0, fontSize:19, fontWeight:700, color:'#f1f5f9', letterSpacing:'-0.3px' },
  subtitle:   { margin:0, fontSize:12, color:'#475569', marginTop:2 },
  refreshBtn: { background:'rgba(30,41,59,0.8)', border:'1px solid rgba(51,65,85,0.5)', borderRadius:8, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center' },
  searchWrap: { display:'flex', alignItems:'center', gap:8, background:'rgba(15,23,42,0.6)', border:'1px solid rgba(51,65,85,0.4)', borderRadius:9, padding:'7px 12px', marginBottom:14 },
  searchInput:{ flex:1, background:'none', border:'none', outline:'none', color:'#cbd5e1', fontSize:12, fontFamily:'inherit' },
  iconBtn:    { background:'none', border:'none', cursor:'pointer', padding:2, display:'flex', alignItems:'center' },
  timeline:   { flex:1, overflowY:'auto' },
  empty:      { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 40px', gap:4 },
  dots:       { display:'flex', gap:6 },
  dot:        { width:8, height:8, borderRadius:'50%', background:'#1E6FBF', animation:'dotP 1.2s infinite ease-in-out' },
};
