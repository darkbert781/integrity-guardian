import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { LiveFeed } from '../components/LiveFeed';
import { ThreatMap } from '../components/ThreatMap';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Activity, AlertTriangle, FileBox, ShieldAlert } from 'lucide-react';

const COLORS = ['#DC2626', '#D97706', '#0284C7'];

function KPICard({ label, value, sub, critical, icon: Icon, iconColor }) {
  return (
    <div className={`enterprise-card p-6 relative overflow-hidden flex flex-col gap-3 group hover:-translate-y-1 transition-all duration-300 bg-surface border border-borderHighlight shadow-sm ${critical ? 'border-t-4 border-t-critical' : 'hover:shadow-md'}`}>
      {critical && (
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-critical/10 blur-[30px] rounded-full"></div>
      )}
      {!critical && (
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 blur-[30px] rounded-full group-hover:bg-primary/10 transition-colors"></div>
      )}
      
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] font-bold text-textMuted uppercase tracking-widest">{label}</span>
        {Icon && (
          <div className={`p-2 rounded-lg ${critical ? 'bg-critical/10' : 'bg-surfaceHighlight'}`}>
            <Icon className="w-5 h-5" color={iconColor || '#94a3b8'} />
          </div>
        )}
      </div>
      
      <span className={`text-4xl font-bold font-mono tracking-tight relative z-10 ${critical && value > 0 ? 'text-critical' : 'text-textMain'}`}>
        {value ?? '--'}
      </span>
      
      {sub && <span className="text-xs text-textMuted font-medium relative z-10">{sub}</span>}
    </div>
  );
}

function Section({ title, children, className }) {
  return (
    <div className={`enterprise-card p-6 flex flex-col bg-surface border border-borderHighlight shadow-sm ${className}`}>
      <h3 className="text-sm font-bold text-textMain tracking-widest uppercase mb-6 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
        {title}
      </h3>
      <div className="flex-1 min-h-0 relative z-10">
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

  const TP = { 
    contentStyle: { 
      background: '#FFFFFF', 
      border: '1px solid #E6EBE9', 
      fontSize: 12, 
      borderRadius: 8, 
      color: '#101816',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    },
    itemStyle: { color: '#667370', fontWeight: 600 }
  };

  return (
    <div className="flex flex-col gap-8 h-full animate-fade-in-up">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-textMain tracking-tight">System Overview</h2>
        <p className="text-sm text-textMuted mt-2">Real-time kernel integrity monitoring status and threat analytics.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard label="Events (24 h)"    value={stats?.total_24h} icon={Activity}      iconColor="#14B891" />
        <KPICard label="Critical Alerts"  value={stats?.CRITICAL}  critical icon={ShieldAlert} iconColor="#DC2626" />
        <KPICard label="Files Monitored"  value={files}            sub="Active kernel baseline" icon={FileBox}      iconColor="#14B891" />
        <KPICard label="Warnings"         value={stats?.WARNING}   sub="Pending review" icon={AlertTriangle} iconColor="#D97706" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area chart – 12 h trend */}
        <Section title="Event Trend (12 h)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gCrit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#DC2626" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gWarn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#D97706" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#D97706" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gInfo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#14B891" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#14B891" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6EBE9" vertical={false} />
              <XAxis dataKey="time" stroke="#9FB3AE" tick={{ fontSize: 11, fill: '#667370' }} tickLine={false} axisLine={false} />
              <YAxis stroke="#9FB3AE" tick={{ fontSize: 11, fill: '#667370' }} tickLine={false} axisLine={false} />
              <Tooltip {...TP} />
              <Area type="monotone" dataKey="CRITICAL" stroke="#DC2626" fill="url(#gCrit)" strokeWidth={2} activeDot={{ r: 5, fill: '#DC2626', stroke: '#fff', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="WARNING"  stroke="#D97706" fill="url(#gWarn)" strokeWidth={2} />
              <Area type="monotone" dataKey="INFO"     stroke="#14B891" fill="url(#gInfo)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        {/* Pie chart – severity breakdown */}
        <Section title="Severity Distribution">
          {pieData.every(d => d.value === 0) ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-textMuted text-sm font-mono">No data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} dataKey="value" stroke="#ffffff" strokeWidth={3} paddingAngle={5}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip {...TP} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, color: '#64748b', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[300px]">
        <Section title="Live Event Stream">
          <LiveFeed />
        </Section>
        <Section title="Threat Map (Simulation)">
          <div className="h-full min-h-[250px] rounded-lg overflow-hidden border border-borderHighlight relative">
            <div className="absolute inset-0 bg-primary/5 pointer-events-none z-10 mix-blend-screen"></div>
            <ThreatMap />
          </div>
        </Section>
      </div>
    </div>
  );
}
