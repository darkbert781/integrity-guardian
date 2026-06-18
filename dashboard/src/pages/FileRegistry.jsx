import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

/* ── icons ─────────────────────────────────────────────────────────────────── */
const Icon = ({ d, size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  folder:  'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  plus:    'M12 4v16m8-8H4',
  search:  'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  lock:    'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  unlock:  'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  x:       'M6 18L18 6M6 6l12 12',
};

const TIER_STYLE = {
  critical:      { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', label: 'Critical' },
  standard:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', label: 'Standard' },
  informational: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', label: 'Informational' },
};

/* ── helper to shorten very long paths ──────────────────────────────────────── */
function truncatePath(p) {
  if (!p || p.length < 50) return p;
  const parts = p.split('\\');
  if (parts.length <= 3) return p;
  return `${parts[0]}\\...\\${parts[parts.length-2]}\\${parts[parts.length-1]}`;
}

export function FileRegistry() {
  const [files,      setFiles]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [newPath,    setNewPath]    = useState('');
  const [newTier,    setNewTier]    = useState('standard');
  const [isRegistering, setIsRegistering] = useState(false);

  const fetchFiles = useCallback(() => {
    setLoading(true);
    api.get('/files/monitored')
      .then(res => setFiles(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleRegister = () => {
    if (!newPath.trim()) return;
    setIsRegistering(true);
    api.post(`/files/register?file_path=${encodeURIComponent(newPath.trim())}&tier=${newTier}`)
      .then(() => {
        setNewPath('');
        setNewTier('standard');
        fetchFiles();
      })
      .catch(err => alert(`Failed to register file: ${err.response?.data?.detail || err.message}`))
      .finally(() => setIsRegistering(false));
  };

  const filtered = files.filter(f =>
    !search || f.file_path?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.iconWrap}><Icon d={ICONS.folder} size={20} color="#1E6FBF" /></div>
          <div>
            <h2 style={S.title}>File Registry</h2>
            <p style={S.subtitle}>{files.length} active paths · Baseline monitoring configuration</p>
          </div>
        </div>
        <button onClick={fetchFiles} style={S.refreshBtn} title="Refresh">
          <Icon d={ICONS.refresh} size={14} color="#94a3b8" />
        </button>
      </div>

      {/* Registration Form */}
      <div style={S.formCard}>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <div style={S.inputWrap}>
            <Icon d={ICONS.folder} size={14} color="#64748b" />
            <input
              style={S.input}
              placeholder="Enter absolute path (e.g. C:\Windows\System32\drivers\etc\hosts)"
              value={newPath}
              onChange={e => setNewPath(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              disabled={isRegistering}
            />
          </div>
          <select
            style={S.select}
            value={newTier}
            onChange={e => setNewTier(e.target.value)}
            disabled={isRegistering}
          >
            <option value="critical">Critical Tier</option>
            <option value="standard">Standard Tier</option>
            <option value="informational">Info Tier</option>
          </select>
          <button
            onClick={handleRegister}
            style={{ ...S.registerBtn, opacity: (!newPath.trim() || isRegistering) ? 0.5 : 1 }}
            disabled={!newPath.trim() || isRegistering}
          >
            <Icon d={ICONS.plus} size={14} />
            {isRegistering ? 'Registering…' : 'Register Path'}
          </button>
        </div>
      </div>

      {/* Search / Filter */}
      <div style={S.toolbar}>
        <div style={S.searchWrap}>
          <Icon d={ICONS.search} size={13} color="#475569" />
          <input
            style={S.searchInput}
            placeholder="Search registered paths…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} style={S.iconBtn}><Icon d={ICONS.x} size={12} color="#64748b" /></button>}
        </div>
        <span style={S.countChip}>{filtered.length} matching</span>
      </div>

      {/* File List */}
      <div style={S.listWrap}>
        {loading ? (
          <div style={S.empty}>
            <div style={S.dots}>{[0,1,2].map(i => <div key={i} style={{ ...S.dot, animationDelay:`${i*0.2}s` }} />)}</div>
            <p style={{ color:'#475569', marginTop:12 }}>Loading registry…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>
            <Icon d={ICONS.folder} size={36} color="#1e3a5f" />
            <p style={{ color:'#334155', margin:'10px 0 4px', fontWeight:600 }}>No monitored files found.</p>
            <p style={{ color:'#475569', fontSize:12 }}>Register a new path above to begin baseline monitoring.</p>
          </div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 40 }}></th>
                <th style={S.th}>File Path</th>
                <th style={S.th}>Monitoring Tier</th>
                <th style={S.th}>Lock Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, idx) => {
                const ts = TIER_STYLE[f.tier] || TIER_STYLE.standard;
                return (
                  <tr key={idx} style={{ ...S.tr, animationDelay:`${idx*30}ms` }} className="reg-row">
                    <td style={S.td}>
                      <Icon d={ICONS.folder} size={14} color="#475569" />
                    </td>
                    <td style={S.td}>
                      <span style={S.pathText} title={f.file_path}>
                        {truncatePath(f.file_path)}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize:10, fontWeight:700, borderRadius:20, padding:'2px 8px',
                                     background:ts.bg, color:ts.color, border:`1px solid ${ts.border}`,
                                     display:'inline-flex', alignItems:'center', letterSpacing:'0.04em' }}>
                        {ts.label.toUpperCase()}
                      </span>
                    </td>
                    <td style={S.td}>
                      {f.is_locked ? (
                        <span style={S.lockedBadge} title="File is protected by FIM driver">
                          <Icon d={ICONS.lock} size={11} /> Locked
                        </span>
                      ) : (
                        <span style={S.unlockedBadge} title="File is monitored but not locked">
                          <Icon d={ICONS.unlock} size={11} /> Monitored
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @keyframes fadeRow { from{opacity:0;transform:translateY(4px);} to{opacity:1;transform:translateY(0);} }
        @keyframes dotP { 0%,80%,100%{transform:scale(0);opacity:.3;} 40%{transform:scale(1);opacity:1;} }
        .reg-row { animation: fadeRow 0.2s ease-out both; transition: background 0.15s; }
        .reg-row:hover td { background: rgba(30,111,191,0.06) !important; }
      `}</style>
    </div>
  );
}

const S = {
  page:       { display:'flex', flexDirection:'column', height:'100%', gap:0 },
  header:     { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 },
  headerLeft: { display:'flex', alignItems:'center', gap:12 },
  iconWrap:   { width:40, height:40, borderRadius:10, background:'rgba(30,111,191,0.12)', border:'1px solid rgba(30,111,191,0.22)', display:'flex', alignItems:'center', justifyContent:'center' },
  title:      { margin:0, fontSize:19, fontWeight:700, color:'#f1f5f9', letterSpacing:'-0.3px' },
  subtitle:   { margin:0, fontSize:12, color:'#475569', marginTop:2 },
  refreshBtn: { background:'rgba(30,41,59,0.8)', border:'1px solid rgba(51,65,85,0.5)', borderRadius:8, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center' },
  formCard:   { background:'linear-gradient(to right, rgba(15,23,42,0.7), rgba(15,23,42,0.4))', border:'1px solid rgba(30,111,191,0.2)', borderRadius:12, padding:14, marginBottom:16, backdropFilter:'blur(8px)' },
  inputWrap:  { display:'flex', alignItems:'center', gap:8, background:'rgba(2,6,23,0.5)', border:'1px solid rgba(51,65,85,0.6)', borderRadius:8, padding:'8px 12px', flex:1, minWidth:260 },
  input:      { flex:1, background:'none', border:'none', outline:'none', color:'#f1f5f9', fontSize:13, fontFamily:'monospace' },
  select:     { background:'rgba(2,6,23,0.5)', border:'1px solid rgba(51,65,85,0.6)', borderRadius:8, padding:'8px 12px', color:'#cbd5e1', fontSize:13, outline:'none', cursor:'pointer', width:140 },
  registerBtn:{ background:'linear-gradient(135deg, #1E6FBF, #1557a0)', border:'1px solid rgba(30,111,191,0.5)', borderRadius:8, padding:'8px 16px', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6, transition:'opacity .2s' },
  toolbar:    { display:'flex', alignItems:'center', gap:10, marginBottom:12 },
  searchWrap: { display:'flex', alignItems:'center', gap:8, background:'rgba(15,23,42,0.5)', border:'1px solid rgba(51,65,85,0.4)', borderRadius:8, padding:'6px 12px', width:260 },
  searchInput:{ flex:1, background:'none', border:'none', outline:'none', color:'#cbd5e1', fontSize:12, fontFamily:'inherit' },
  iconBtn:    { background:'none', border:'none', cursor:'pointer', padding:2, display:'flex', alignItems:'center' },
  countChip:  { fontSize:11, color:'#475569', marginLeft:'auto' },
  listWrap:   { flex:1, background:'rgba(15,23,42,0.5)', border:'1px solid rgba(30,111,191,0.12)', borderRadius:12, overflow:'auto', backdropFilter:'blur(8px)' },
  table:      { width:'100%', borderCollapse:'collapse', tableLayout:'fixed' },
  th:         { padding:'12px 14px', textAlign:'left', fontSize:10, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid rgba(30,111,191,0.12)', background:'rgba(15,23,42,0.7)', position:'sticky', top:0, zIndex:1 },
  tr:         { borderBottom:'1px solid rgba(30,41,59,0.7)' },
  td:         { padding:'11px 14px', verticalAlign:'middle' },
  pathText:   { fontFamily:'monospace', fontSize:12, color:'#94a3b8' },
  lockedBadge:{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(22,101,52,0.15)', border:'1px solid rgba(22,101,52,0.3)', borderRadius:6, padding:'3px 8px', fontSize:10, fontWeight:600, color:'#4ade80' },
  unlockedBadge:{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(30,41,59,0.5)', border:'1px solid rgba(51,65,85,0.5)', borderRadius:6, padding:'3px 8px', fontSize:10, fontWeight:600, color:'#94a3b8' },
  empty:      { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 40px', gap:4 },
  dots:       { display:'flex', gap:6 },
  dot:        { width:8, height:8, borderRadius:'50%', background:'#1E6FBF', animation:'dotP 1.2s infinite ease-in-out' },
};
