import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';

/* ── score color ────────────────────────────────────────────────────────────── */
const scoreColor = (s) => s < -0.1 ? '#ef4444' : s < 0.1 ? '#f59e0b' : '#4ade80';
const BAR_COLORS = { CRITICAL: '#ef4444', WARNING: '#f59e0b', INFO: '#3b82f6' };

/* ── mini icon ──────────────────────────────────────────────────────────────── */
const Icon = ({ d, size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  brain:   'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  warn:    'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
};

/* ── gauge component ────────────────────────────────────────────────────────── */
function ThreatGauge({ value, label }) {
  const pct = Math.min(Math.max(value, 0), 100);
  const color = pct >= 60 ? '#ef4444' : pct >= 30 ? '#f59e0b' : '#4ade80';
  const r = 42, circ = 2 * Math.PI * r;
  const stroke = circ * (1 - pct / 100);
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <svg width={110} height={70} viewBox="0 0 110 70">
        <path d="M10 60 A45 45 0 0 1 100 60" fill="none" stroke="#1e293b" strokeWidth={10} strokeLinecap="round" />
        <path d="M10 60 A45 45 0 0 1 100 60" fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
              strokeDasharray={`${circ * 0.5 * (pct/100)} ${circ * 0.5 * (1 - pct/100) + circ * 0.5}`} />
        <text x="55" y="58" textAnchor="middle" fill={color} fontSize={20} fontWeight={700} fontFamily="monospace">
          {Math.round(pct)}
        </text>
      </svg>
      <span style={{ fontSize: 11, color: '#475569', textAlign: 'center' }}>{label}</span>
    </div>
  );
}

/* ── stat card ──────────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background:'rgba(15,23,42,0.5)', border:'1px solid rgba(30,111,191,0.12)', borderRadius:12,
                  padding:'14px 18px', display:'flex', flexDirection:'column', gap:4 }}>
      <span style={{ fontSize:10, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</span>
      <span style={{ fontSize:28, fontWeight:800, color: color || '#f1f5f9', fontFamily:'monospace' }}>{value ?? '--'}</span>
      {sub && <span style={{ fontSize:11, color:'#475569' }}>{sub}</span>}
    </div>
  );
}

/* ── section wrapper ────────────────────────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <div style={{ background:'rgba(15,23,42,0.5)', border:'1px solid rgba(30,111,191,0.1)', borderRadius:13,
                  padding:'18px 20px', backdropFilter:'blur(8px)' }}>
      <h3 style={{ margin:'0 0 16px', fontSize:11, fontWeight:600, color:'#475569',
                   textTransform:'uppercase', letterSpacing:'0.08em' }}>{title}</h3>
      {children}
    </div>
  );
}

const TP = { contentStyle:{ background:'#0D1B2A', border:'1px solid rgba(30,111,191,0.2)', fontSize:11 } };

export function AIInsights() {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/events?limit=200')
      .then(r => setEvents(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  /* ── derived data ──────────────────────────────────────────────────────── */
  const scatterData = events.map((e, i) => ({
    x: i,
    y: parseFloat(e.ai_anomaly_score) || 0,
    z: e.severity === 'CRITICAL' ? 22 : e.severity === 'WARNING' ? 11 : 6,
    name: e.file_path,
    sev: e.severity,
  }));

  const buckets = { CRITICAL: 0, WARNING: 0, INFO: 0 };
  events.forEach(e => { if (buckets[e.severity] !== undefined) buckets[e.severity]++; });
  const barData = Object.entries(buckets).map(([k, v]) => ({ name: k, count: v }));

  const anomalies = events.filter(e => parseFloat(e.ai_anomaly_score) < 0);
  const anomalyRate = events.length > 0 ? (anomalies.length / events.length) * 100 : 0;
  const threatScore = Math.min(buckets.CRITICAL * 8 + buckets.WARNING * 2, 100);

  /* ── radar data: simulated feature importances ─────────────────────────── */
  const radarData = [
    { subject: 'Hash Mismatch',  A: Math.min(buckets.CRITICAL * 12, 100) },
    { subject: 'Event Freq.',    A: Math.min(events.length / 2, 100) },
    { subject: 'Warnings',       A: Math.min(buckets.WARNING * 5, 100) },
    { subject: 'Anomaly Rate',   A: Math.round(anomalyRate) },
    { subject: 'Severity Mix',   A: buckets.CRITICAL > 0 ? 80 : buckets.WARNING > 0 ? 45 : 15 },
  ];

  /* ── top anomalous files ─────────────────────────────────────────────────── */
  const topAnomalies = [...anomalies]
    .sort((a, b) => parseFloat(a.ai_anomaly_score) - parseFloat(b.ai_anomaly_score))
    .slice(0, 6);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:2 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'rgba(30,111,191,0.12)',
                      border:'1px solid rgba(30,111,191,0.22)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon d={ICONS.brain} size={20} color="#1E6FBF" />
        </div>
        <div>
          <h2 style={{ margin:0, fontSize:19, fontWeight:700, color:'#f1f5f9', letterSpacing:'-0.3px' }}>AI Threat Insights</h2>
          <p style={{ margin:0, fontSize:12, color:'#475569', marginTop:2 }}>
            Isolation Forest model · {events.length} events analysed
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
          <div style={{ display:'flex', gap:6 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#1E6FBF',
                                    animation:'dotP 1.2s infinite ease-in-out', animationDelay:`${i*0.2}s` }} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12 }}>
            <StatCard label="Events Analysed" value={events.length} />
            <StatCard label="Anomalies Found" value={anomalies.length} color="#ef4444" sub={`${anomalyRate.toFixed(1)}% of events`} />
            <StatCard label="Critical Count"  value={buckets.CRITICAL} color="#ef4444" />
            <StatCard label="Warning Count"   value={buckets.WARNING}  color="#f59e0b" />
          </div>

          {/* Gauges + Radar */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <Section title="Threat Pressure Gauges">
              <div style={{ display:'flex', justifyContent:'space-around', flexWrap:'wrap', gap:14, padding:'8px 0' }}>
                <ThreatGauge value={threatScore}  label="Overall Threat Score" />
                <ThreatGauge value={anomalyRate}  label="Anomaly Rate %" />
                <ThreatGauge value={Math.min(buckets.CRITICAL * 10, 100)} label="Critical Pressure" />
              </div>
            </Section>
            <Section title="Feature Risk Radar">
              <ResponsiveContainer width="100%" height={190}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill:'#475569', fontSize:10 }} />
                  <PolarRadiusAxis angle={30} domain={[0,100]} tick={{ fill:'#334155', fontSize:9 }} />
                  <Radar dataKey="A" stroke="#1E6FBF" fill="#1E6FBF" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </Section>
          </div>

          {/* Anomaly scatter + bar */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14 }}>
            <Section title="Anomaly Score Distribution (per event)">
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="x" name="Event #" stroke="#334155" tick={{ fontSize:10 }} label={{ value:'Event Index', position:'insideBottom', offset:-2, fill:'#475569', fontSize:10 }} />
                  <YAxis dataKey="y" name="Score"   stroke="#334155" tick={{ fontSize:10 }} domain={[-1,1]} />
                  <ZAxis dataKey="z" range={[18,180]} />
                  <Tooltip cursor={{ strokeDasharray:'3 3' }} {...TP}
                    formatter={(val, name) => name === 'Score' ? val.toFixed(3) : val} />
                  <Scatter data={scatterData}>
                    {scatterData.map((d, i) => <Cell key={i} fill={scoreColor(d.y)} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', gap:14, marginTop:10, justifyContent:'center' }}>
                {[['Anomaly (< -0.1)', '#ef4444'], ['Borderline', '#f59e0b'], ['Normal (> 0.1)', '#4ade80']].map(([l,c]) => (
                  <span key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'#475569' }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:c }} />{l}
                  </span>
                ))}
              </div>
            </Section>
            <Section title="Events by Severity">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#334155" tick={{ fontSize:10 }} />
                  <YAxis stroke="#334155" tick={{ fontSize:10 }} />
                  <Tooltip {...TP} />
                  <Bar dataKey="count" radius={[5,5,0,0]}>
                    {barData.map((d, i) => <Cell key={i} fill={BAR_COLORS[d.name]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>
          </div>

          {/* Top anomalous files */}
          <Section title="Most Suspicious Files (lowest AI scores)">
            {topAnomalies.length === 0 ? (
              <div style={{ display:'flex', alignItems:'center', gap:8, color:'#4ade80', fontSize:13 }}>
                <Icon d="M5 13l4 4L19 7" size={16} color="#4ade80" /> No anomalies detected — system baseline is clean.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {topAnomalies.map((e, i) => {
                  const sc = parseFloat(e.ai_anomaly_score);
                  const pct = Math.min(Math.max((-sc) * 100, 0), 100);
                  return (
                    <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10,
                                             background:'rgba(30,41,59,0.4)', borderRadius:8, padding:'8px 12px',
                                             border:`1px solid ${scoreColor(sc)}22` }}>
                      <span style={{ fontSize:11, color:'#475569', width:16, textAlign:'right', flexShrink:0 }}>#{i+1}</span>
                      <span style={{ fontFamily:'monospace', fontSize:11, color:'#94a3b8', flex:1, overflow:'hidden',
                                     textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.file_path}</span>
                      <div style={{ width:80, height:6, background:'#1e293b', borderRadius:3, flexShrink:0 }}>
                        <div style={{ width:`${pct}%`, height:'100%', background:scoreColor(sc), borderRadius:3,
                                      transition:'width 0.5s' }} />
                      </div>
                      <span style={{ fontFamily:'monospace', fontSize:11, color:scoreColor(sc),
                                     width:50, textAlign:'right', flexShrink:0 }}>{sc.toFixed(3)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </>
      )}

      <style>{`@keyframes dotP{0%,80%,100%{transform:scale(0);opacity:.3;}40%{transform:scale(1);opacity:1;}}`}</style>
    </div>
  );
}
