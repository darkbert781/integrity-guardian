import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { LiveFeed } from '../components/LiveFeed';
import { ThreatMap } from '../components/ThreatMap';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Activity, AlertTriangle, FileBox, ShieldAlert } from 'lucide-react';

const COLORS = ['#d12223', '#d97706', '#0052cc'];

function KPICard({ label, value, sub, critical, icon: Icon, iconColor }) {
  return (
    <div className="enterprise-card p-5 relative overflow-hidden flex flex-col gap-2">
      {critical && <div className="absolute top-0 left-0 right-0 h-1 bg-critical" />}
      
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-textMuted uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="w-5 h-5" color={iconColor || '#64748b'} />}
      </div>
      
      <span className={`text-3xl font-bold font-mono leading-none ${critical && value > 0 ? 'text-critical' : 'text-textMain'}`}>
        {value ?? '--'}
      </span>
      
      {sub && <span className="text-xs text-textMuted">{sub}</span>}
    </div>
  );
}

function Section({ title, children, className }) {
  return (
    <div className={`enterprise-card p-5 flex flex-col ${className}`}>
      <h3 className="text-sm font-bold text-textMain mb-4">{title}</h3>
      <div className="flex-1 min-h-0">
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

  const TP = { contentStyle: { background: '#ffffff', border: '1px solid #e2e8f0', fontSize: 12, borderRadius: 4, color: '#0f172a' } };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-textMain tracking-tight">System Overview</h2>
        <p className="text-sm text-textMuted mt-1">Real-time integrity monitoring status and alerts</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard label="Events (24 h)"    value={stats?.total_24h} icon={Activity} iconColor="#0052cc" />
        <KPICard label="Critical Alerts"  value={stats?.CRITICAL}  critical icon={ShieldAlert} iconColor="#d12223" />
        <KPICard label="Files Monitored"  value={files}            sub="Active baseline" icon={FileBox} />
        <KPICard label="Warnings"         value={stats?.WARNING}   sub="Needs review" icon={AlertTriangle} iconColor="#d97706" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area chart – 12 h trend */}
        <Section title="Event Trend (12 h)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gCrit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#d12223" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#d12223" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gWarn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#d97706" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gInfo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0052cc" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#0052cc" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip {...TP} />
              <Area type="monotone" dataKey="CRITICAL" stroke="#d12223" fill="url(#gCrit)" strokeWidth={2} />
              <Area type="monotone" dataKey="WARNING"  stroke="#d97706" fill="url(#gWarn)" strokeWidth={2} />
              <Area type="monotone" dataKey="INFO"     stroke="#0052cc" fill="url(#gInfo)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        {/* Pie chart – severity breakdown */}
        <Section title="Severity Mix">
          {pieData.every(d => d.value === 0) ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-textMuted text-sm">No data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" stroke="none" paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip {...TP} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, color: '#475569' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[300px]">
        <Section title="Live Feed">
          <LiveFeed />
        </Section>
        <Section title="Threat Map (Simulation)">
          <div className="h-full min-h-[250px]">
            <ThreatMap />
          </div>
        </Section>
      </div>
    </div>
  );
}
