import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { SeverityBadge } from '../components/SeverityBadge';

/* ── icons ─────────────────────────────────────────────────────────────────── */
const Icon = ({ d, size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  bell:    'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  check:   'M5 13l4 4L19 7',
  escalate:'M13 10V3L4 14h7v7l9-11h-7z',
  x:       'M6 18L18 6M6 6l12 12',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  clock:   'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
};

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return isNaN(d) ? ts : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
}

/* ── severity gradient config ───────────────────────────────────────────────── */
const SEV = {
  CRITICAL: { glow: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', accent: '#ef4444', label: '#fca5a5' },
  WARNING:  { glow: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)', accent: '#f59e0b', label: '#fcd34d' },
  INFO:     { glow: 'rgba(30,111,191,0.08)', border: 'rgba(30,111,191,0.25)', accent: '#3b82f6', label: '#93c5fd' },
};

/* ── Alert Card ─────────────────────────────────────────────────────────────── */
function AlertCard({ a, onAction, acting }) {
  const cfg = SEV[a.severity] || SEV.INFO;
  return (
    <div style={{ ...S.card, background: cfg.glow, border: `1px solid ${cfg.border}`, borderLeft: `4px solid ${cfg.accent}` }}
         className="alert-card">
      <div style={S.cardTop}>
        {/* Left: badge + meta */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <SeverityBadge severity={a.severity} />
            <span style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon d={ICONS.clock} size={11} color="#475569" />
              {fmtDate(a.timestamp)}
            </span>
            {a.status && (
              <span style={{ ...S.statusPill, background: a.status === 'acknowledged' ? 'rgba(22,101,52,0.15)' : a.status === 'escalated' ? 'rgba(127,29,29,0.15)' : 'rgba(30,41,59,0.5)',
                             color: a.status === 'acknowledged' ? '#4ade80' : a.status === 'escalated' ? '#f87171' : '#64748b',
                             border: `1px solid ${a.status === 'acknowledged' ? 'rgba(22,101,52,0.3)' : a.status === 'escalated' ? 'rgba(127,29,29,0.3)' : 'rgba(51,65,85,0.4)'}` }}>
                {a.status}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>
            Event ID: <span style={{ color: '#cbd5e1' }}>#{a.event_id}</span>
          </p>
          {a.message && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{a.message}</p>
          )}
        </div>

        {/* Right: action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button
            id={`ack-btn-${a.id}`}
            onClick={() => onAction(a.id, 'acknowledge')}
            disabled={acting === a.id || a.status === 'acknowledged'}
            style={{ ...S.actionBtn, ...S.ackBtn, opacity: (acting === a.id || a.status === 'acknowledged') ? 0.5 : 1 }}>
            <Icon d={ICONS.check} size={12} color="#4ade80" />
            Acknowledge
          </button>
          <button
            id={`esc-btn-${a.id}`}
            onClick={() => onAction(a.id, 'escalate')}
            disabled={acting === a.id || a.status === 'escalated'}
            style={{ ...S.actionBtn, ...S.escBtn, opacity: (acting === a.id || a.status === 'escalated') ? 0.5 : 1 }}>
            <Icon d={ICONS.escalate} size={12} color="#f87171" />
            Escalate
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── main Alerts component ─────────────────────────────────────────────────── */
export function Alerts() {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(null);
  const [filter,  setFilter]  = useState('ALL');

  const fetchAlerts = useCallback(() => {
    setLoading(true);
    api.get('/alerts')
      .then(res => setAlerts(res.data.alerts || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleAction = (id, action) => {
    setActing(id);
    api.put(`/alerts/${id}/${action}`)
      .then(() => fetchAlerts())
      .finally(() => setActing(null));
  };

  const filtered = filter === 'ALL' ? alerts : alerts.filter(a => a.severity === filter);
  const counts   = { CRITICAL: 0, WARNING: 0, INFO: 0 };
  alerts.forEach(a => { if (counts[a.severity] !== undefined) counts[a.severity]++; });

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.iconWrap}><Icon d={ICONS.bell} size={20} color="#1E6FBF" /></div>
          <div>
            <h2 style={S.title}>Alert Inbox</h2>
            <p style={S.subtitle}>{alerts.length} alert{alerts.length !== 1 ? 's' : ''} requiring review</p>
          </div>
        </div>
        <button onClick={fetchAlerts} style={S.refreshBtn} title="Refresh">
          <Icon d={ICONS.refresh} size={14} color="#94a3b8" />
        </button>
      </div>

      {/* Stats + filter pills */}
      <div style={S.statRow}>
        {[['ALL', alerts.length], ['CRITICAL', counts.CRITICAL], ['WARNING', counts.WARNING], ['INFO', counts.INFO]].map(([label, cnt]) => {
          const col = { CRITICAL: '#ef4444', WARNING: '#f59e0b', INFO: '#3b82f6', ALL: '#60a5fa' }[label];
          return (
            <button key={label} onClick={() => setFilter(label)}
              style={{ ...S.statPill, ...(filter === label ? { border: `1px solid ${col}40`, background: `${col}18`, color: col } : {}) }}>
              {label !== 'ALL' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: col }} />}
              <span style={{ fontWeight: 700 }}>{cnt}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Alert list */}
      <div style={S.list}>
        {loading ? (
          <div style={S.empty}>
            <div style={S.dots}>{[0,1,2].map(i => <div key={i} style={{ ...S.dot, animationDelay:`${i*0.2}s` }} />)}</div>
            <p style={{ color:'#475569', marginTop:12 }}>Loading alerts…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 36 }}>🛡️</div>
            <p style={{ color: '#334155', margin: '10px 0 4px', fontWeight: 600 }}>
              {filter === 'ALL' ? 'No alerts — system looks clean!' : `No ${filter} alerts.`}
            </p>
            <p style={{ color: '#475569', fontSize: 12 }}>Integrity Guardian is monitoring your files.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((a, idx) => (
              <div key={a.id} style={{ animation: `fadeSlide 0.25s ease-out ${idx * 40}ms both` }}>
                <AlertCard a={a} onAction={handleAction} acting={acting} />
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlide { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
        @keyframes dotP { 0%,80%,100%{transform:scale(0);opacity:.3;} 40%{transform:scale(1);opacity:1;} }
        .alert-card { transition: transform 0.15s, box-shadow 0.15s; }
        .alert-card:hover { transform: translateY(-1px); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
      `}</style>
    </div>
  );
}

/* ── styles ─────────────────────────────────────────────────────────────────── */
const S = {
  page:       { display:'flex', flexDirection:'column', height:'100%', gap:0 },
  header:     { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 },
  headerLeft: { display:'flex', alignItems:'center', gap:12 },
  iconWrap:   { width:40, height:40, borderRadius:10, background:'rgba(30,111,191,0.12)', border:'1px solid rgba(30,111,191,0.22)', display:'flex', alignItems:'center', justifyContent:'center' },
  title:      { margin:0, fontSize:19, fontWeight:700, color:'#f1f5f9', letterSpacing:'-0.3px' },
  subtitle:   { margin:0, fontSize:12, color:'#475569', marginTop:2 },
  refreshBtn: { background:'rgba(30,41,59,0.8)', border:'1px solid rgba(51,65,85,0.5)', borderRadius:8, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center' },
  statRow:    { display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' },
  statPill:   { display:'flex', alignItems:'center', gap:6, background:'rgba(30,41,59,0.6)', border:'1px solid rgba(51,65,85,0.4)', borderRadius:20, padding:'6px 14px', cursor:'pointer', fontSize:12, color:'#64748b', transition:'all .15s', fontFamily:'inherit' },
  list:       { flex:1, overflowY:'auto' },
  card:       { borderRadius:12, padding:'14px 16px' },
  cardTop:    { display:'flex', gap:16, alignItems:'flex-start' },
  statusPill: { display:'inline-flex', alignItems:'center', borderRadius:20, padding:'1px 8px', fontSize:10, fontWeight:600 },
  actionBtn:  { display:'flex', alignItems:'center', gap:5, borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:11, fontWeight:600, border:'none', fontFamily:'inherit', transition:'opacity .15s' },
  ackBtn:     { background:'rgba(22,101,52,0.2)', color:'#4ade80', border:'1px solid rgba(22,101,52,0.3)' },
  escBtn:     { background:'rgba(127,29,29,0.2)', color:'#f87171', border:'1px solid rgba(127,29,29,0.3)' },
  empty:      { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 40px', gap:4 },
  dots:       { display:'flex', gap:6 },
  dot:        { width:8, height:8, borderRadius:'50%', background:'#1E6FBF', animation:'dotP 1.2s infinite ease-in-out' },
};
