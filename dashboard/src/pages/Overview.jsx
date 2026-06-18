import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { LiveFeed } from '../components/LiveFeed';
import { ThreatMap } from '../components/ThreatMap';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

/* ── icons ─────────────────────────────────────────────────────────────────── */
const Icon = ({ d, size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  pulse:   'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  alert:   'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  folder:  'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  warning: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

const COLORS = ['#C0392B', '#D97706', '#1E6FBF'];

function KPICard({ label, value, sub, critical, icon, iconColor }) {
  return (
    <div style={{
      background: 'rgba(15,23,42,0.5)',
      border: `1px solid ${critical ? 'rgba(239,68,68,0.3)' : 'rgba(30,111,191,0.12)'}`,
      borderRadius: 14,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      backdropFilter: 'blur(8px)',
      boxShadow: critical ? '0 0 20px rgba(239,68,68,0.15)' : 'none',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {critical && <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg, transparent, #ef4444, transparent)' }} />}
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
        {icon && <Icon d={icon} size={16} color={iconColor || '#475569'} />}
      </div>
      
      <span style={{ 
        fontSize: 36, 
        fontWeight: 800, 
        color: critical && value > 0 ? '#ef4444' : '#f1f5f9',
        fontFamily: 'monospace',
        lineHeight: 1.1,
        animation: critical && value > 0 ? 'pulse 2s infinite' : 'none'
      }}>{value ?? '--'}</span>
      
      {sub && <span style={{ fontSize: 12, color: '#64748b' }}>{sub}</span>}
    </div>
  );
}

function Section({ title, children, className }) {
  return (
    <div className={className} style={{
      background: 'rgba(15,23,42,0.5)',
      border: '1px solid rgba(30,111,191,0.1)',
      borderRadius: 14,
      padding: '20px',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</h3>
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

export function Overview() {
  const [stats, setStats] = useState(null);
  const [files, setFiles]  = useState(0);
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    api.get('/events/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/files/monitored').then(r => setFiles(r.data.length)).catch(() => {});
  }, []);

  // Build dummy trend data while live data accumulates
  useEffect(() => {
    const hours = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setHours(d.getHours() - (11 - i));
      return {
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        CRITICAL: Math.floor(Math.random() * 3),
        WARNING: Math.floor(Math.random() * 8),
        INFO: Math.floor(Math.random() * 20),
      };
    });
    setTrendData(hours);
  }, []);

  const pieData = stats ? [
    { name: 'Critical', value: stats.CRITICAL },
    { name: 'Warning',  value: stats.WARNING  },
    { name: 'Info',     value: stats.INFO      },
  ] : [];

  const TP = { contentStyle:{ background:'#0D1B2A', border:'1px solid rgba(30,111,191,0.2)', fontSize:11, borderRadius: 8 } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>System Overview</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Real-time integrity monitoring status and alerts</p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <KPICard label="Events (24 h)"    value={stats?.total_24h} icon={ICONS.pulse} iconColor="#1E6FBF" />
        <KPICard label="Critical Alerts"  value={stats?.CRITICAL}  critical icon={ICONS.alert} iconColor="#ef4444" />
        <KPICard label="Files Monitored"  value={files}            sub="Active baseline" icon={ICONS.folder} />
        <KPICard label="Warnings"         value={stats?.WARNING}   sub="Needs review" icon={ICONS.warning} iconColor="#f59e0b" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, '@media (min-width: 1024px)': { gridTemplateColumns: '2fr 1fr' } }} className="lg:grid-cols-3">
        {/* Area chart – 12 h trend */}
        <Section title="Event Trend (12 h)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gCrit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gWarn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gInfo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip {...TP} />
              <Area type="monotone" dataKey="CRITICAL" stroke="#ef4444" fill="url(#gCrit)" strokeWidth={2} />
              <Area type="monotone" dataKey="WARNING"  stroke="#f59e0b" fill="url(#gWarn)" strokeWidth={2} />
              <Area type="monotone" dataKey="INFO"     stroke="#3b82f6" fill="url(#gInfo)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        {/* Pie chart – severity breakdown */}
        <Section title="Severity Mix">
          {pieData.every(d => d.value === 0) ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#475569', fontSize: 13 }}>No data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" stroke="none" paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip {...TP} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, flex: 1, minHeight: 300 }} className="lg:grid-cols-2">
        <Section title="Live Feed">
          <LiveFeed />
        </Section>
        <Section title="Threat Map (Simulation)">
          <div style={{ height: '100%', minHeight: 250 }}>
            <ThreatMap />
          </div>
        </Section>
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
        }
      `}</style>
    </div>
  );
}
