import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { SeverityBadge } from '../components/SeverityBadge';

/* ── tiny inline SVG helper ────────────────────────────────────────────────── */
const Icon = ({ d, size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  clock:   'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  file:    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  filter:  'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
  brain:   'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  x:       'M6 18L18 6M6 6l12 12',
};

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return isNaN(d) ? ts : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
}

const SEVERITY_OPTS = ['ALL', 'CRITICAL', 'WARNING', 'INFO'];

export function EventFeed() {
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('ALL');
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    api.get('/events?limit=100')
      .then(res => setEvents(res.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const filtered = events.filter(e => {
    const matchSev = filter === 'ALL' || e.severity === filter;
    const matchSrch = !search || e.file_path?.toLowerCase().includes(search.toLowerCase())
                              || e.event_type?.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchSrch;
  });

  const severityColor = { CRITICAL: '#ef4444', WARNING: '#f59e0b', INFO: '#3b82f6' };
  const leftBorder    = { CRITICAL: '#ef4444', WARNING: '#f59e0b', INFO: '#1e3a5f' };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.iconWrap}><Icon d={ICONS.clock} size={20} color="#1E6FBF" /></div>
          <div>
            <h2 style={S.title}>Event Timeline</h2>
            <p style={S.subtitle}>{events.length} total events · real-time filesystem audit log</p>
          </div>
        </div>
        <button onClick={fetchEvents} style={S.refreshBtn} title="Refresh">
          <Icon d={ICONS.refresh} size={14} color="#94a3b8" />
        </button>
      </div>

      {/* Toolbar */}
      <div style={S.toolbar}>
        {/* Search */}
        <div style={S.searchWrap}>
          <Icon d={ICONS.file} size={13} color="#475569" />
          <input style={S.searchInput} placeholder="Search path or event type…"
                 value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} style={S.iconBtn}><Icon d={ICONS.x} size={12} color="#64748b" /></button>}
        </div>
        {/* Severity pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {SEVERITY_OPTS.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ ...S.pill, ...(filter === s ? S.pillActive : {}) }}>
              {s !== 'ALL' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: severityColor[s], display: 'inline-block' }} />}
              {s}
            </button>
          ))}
        </div>
        <span style={S.countChip}>{filtered.length} shown</span>
      </div>

      {/* Table + detail panel */}
      <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>
        <div style={S.tableWrap}>
          {loading ? (
            <div style={S.empty}>
              <div style={S.dots}>{[0,1,2].map(i => <div key={i} style={{ ...S.dot, animationDelay: `${i*0.2}s` }} />)}</div>
              <p style={{ color: '#475569', marginTop: 12 }}>Loading events…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={S.empty}>
              <Icon d={ICONS.filter} size={32} color="#1e3a5f" />
              <p style={{ color: '#334155', marginTop: 10 }}>No events match the current filter.</p>
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  {['Timestamp', 'File Path', 'Event Type', 'Severity', 'AI Score'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, idx) => (
                  <tr key={e.id}
                      onClick={() => setSelected(selected?.id === e.id ? null : e)}
                      style={{
                        ...S.tr,
                        borderLeft: `3px solid ${selected?.id === e.id ? severityColor[e.severity] || '#1e3a5f' : leftBorder[e.severity] || '#1e3a5f'}`,
                        background: selected?.id === e.id ? 'rgba(30,111,191,0.08)' : 'transparent',
                        animationDelay: `${idx * 30}ms`,
                      }}
                      className="ev-row">
                    <td style={S.td}><span style={{ fontSize: 11, color: '#64748b' }}>{fmtDate(e.timestamp)}</span></td>
                    <td style={S.td}><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', wordBreak: 'break-all' }}>{e.file_path}</span></td>
                    <td style={S.td}><span style={{ fontSize: 12, color: '#cbd5e1' }}>{e.event_type}</span></td>
                    <td style={S.td}><SeverityBadge severity={e.severity} /></td>
                    <td style={S.td}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12,
                                     color: parseFloat(e.ai_anomaly_score) < 0 ? '#ef4444' : '#4ade80' }}>
                        {parseFloat(e.ai_anomaly_score || 0).toFixed(3)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail drawer */}
        {selected && (
          <div style={S.drawer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13 }}>Event Detail</span>
              <button onClick={() => setSelected(null)} style={S.iconBtn}><Icon d={ICONS.x} size={14} color="#64748b" /></button>
            </div>
            {[
              ['ID',         selected.id],
              ['Timestamp',  fmtDate(selected.timestamp)],
              ['Type',       selected.event_type],
              ['Severity',   selected.severity],
              ['AI Score',   parseFloat(selected.ai_anomaly_score || 0).toFixed(4)],
              ['Process',    selected.process_name || '—'],
              ['PID',        selected.pid || '—'],
              ['File Path',  selected.file_path],
              ['Old Hash',   selected.old_hash || '—'],
              ['New Hash',   selected.new_hash || '—'],
            ].map(([label, val]) => (
              <div key={label} style={S.drawerRow}>
                <span style={S.drawerLabel}>{label}</span>
                <span style={S.drawerVal}>{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeRow { from { opacity:0; transform:translateX(-4px); } to { opacity:1; transform:translateX(0); } }
        @keyframes dotP { 0%,80%,100%{transform:scale(0);opacity:.3;} 40%{transform:scale(1);opacity:1;} }
        @keyframes spin { to { transform:rotate(360deg); } }
        .ev-row { animation: fadeRow 0.25s ease-out both; cursor:pointer; transition: background 0.15s; }
        .ev-row:hover td { background: rgba(30,111,191,0.05) !important; }
      `}</style>
    </div>
  );
}

/* ── styles ─────────────────────────────────────────────────────────────────── */
const S = {
  page:       { display:'flex', flexDirection:'column', height:'100%', gap:0 },
  header:     { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 },
  headerLeft: { display:'flex', alignItems:'center', gap:12 },
  iconWrap:   { width:40, height:40, borderRadius:10, background:'rgba(30,111,191,0.12)', border:'1px solid rgba(30,111,191,0.22)', display:'flex', alignItems:'center', justifyContent:'center' },
  title:      { margin:0, fontSize:19, fontWeight:700, color:'#f1f5f9', letterSpacing:'-0.3px' },
  subtitle:   { margin:0, fontSize:12, color:'#475569', marginTop:2 },
  refreshBtn: { background:'rgba(30,41,59,0.8)', border:'1px solid rgba(51,65,85,0.5)', borderRadius:8, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center' },
  toolbar:    { display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' },
  searchWrap: { display:'flex', alignItems:'center', gap:8, background:'rgba(15,23,42,0.6)', border:'1px solid rgba(51,65,85,0.4)', borderRadius:9, padding:'7px 12px', flex:1, minWidth:180 },
  searchInput:{ flex:1, background:'none', border:'none', outline:'none', color:'#cbd5e1', fontSize:12, fontFamily:'inherit' },
  iconBtn:    { background:'none', border:'none', cursor:'pointer', padding:2, display:'flex', alignItems:'center' },
  pill:       { display:'flex', alignItems:'center', gap:5, background:'rgba(30,41,59,0.6)', border:'1px solid rgba(51,65,85,0.4)', borderRadius:20, padding:'4px 11px', cursor:'pointer', fontSize:11, fontWeight:600, color:'#64748b', transition:'all .15s' },
  pillActive: { background:'rgba(30,111,191,0.15)', border:'1px solid rgba(30,111,191,0.4)', color:'#60a5fa' },
  countChip:  { fontSize:11, color:'#475569', whiteSpace:'nowrap' },
  tableWrap:  { flex:1, background:'rgba(15,23,42,0.5)', border:'1px solid rgba(30,111,191,0.12)', borderRadius:13, overflow:'auto', backdropFilter:'blur(8px)' },
  table:      { width:'100%', borderCollapse:'collapse' },
  th:         { padding:'11px 13px', textAlign:'left', fontSize:10, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid rgba(30,111,191,0.1)', background:'rgba(15,23,42,0.7)', position:'sticky', top:0, zIndex:1 },
  tr:         { transition:'background 0.12s', borderLeft:'3px solid transparent' },
  td:         { padding:'10px 13px', borderBottom:'1px solid rgba(30,41,59,0.6)', verticalAlign:'middle' },
  empty:      { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 40px', gap:4 },
  dots:       { display:'flex', gap:6 },
  dot:        { width:8, height:8, borderRadius:'50%', background:'#1E6FBF', animation:'dotP 1.2s infinite ease-in-out' },
  drawer:     { width:260, flexShrink:0, background:'rgba(15,23,42,0.7)', border:'1px solid rgba(30,111,191,0.15)', borderRadius:13, padding:16, backdropFilter:'blur(8px)', overflowY:'auto' },
  drawerRow:  { display:'flex', flexDirection:'column', gap:2, marginBottom:10, paddingBottom:10, borderBottom:'1px solid rgba(30,41,59,0.5)' },
  drawerLabel:{ fontSize:10, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.07em' },
  drawerVal:  { fontSize:12, color:'#cbd5e1', fontFamily:'monospace', wordBreak:'break-all' },
};
