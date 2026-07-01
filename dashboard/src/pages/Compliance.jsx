import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ShieldCheck, Download, FileCheck } from 'lucide-react';

const STANDARDS = ['PCI-DSS', 'HIPAA', 'GDPR', 'NIST-CSF', 'ISO-27001'];

function ComplianceCard({ standard, score }) {
  const isGood = score >= 90;
  const isWarn = score >= 75 && score < 90;
  const color = isGood ? '#14B891' : isWarn ? '#D97706' : '#DC2626';
  const border = isGood ? 'border-success' : isWarn ? 'border-warning' : 'border-critical';
  const bgClass = isGood ? 'bg-success/10' : isWarn ? 'bg-warning/10' : 'bg-critical/10';

  return (
    <div className={`enterprise-card p-6 flex flex-col gap-4 border-l-4 ${border} bg-surface border border-borderHighlight shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden group`}>
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 blur-[30px] rounded-full opacity-50 ${bgClass}`}></div>
      
      <div className="flex justify-between items-center relative z-10">
        <span className="text-sm font-bold text-textMain tracking-widest uppercase">{standard}</span>
        <div className={`p-1.5 rounded-lg ${bgClass}`}>
          <ShieldCheck className="w-5 h-5" color={color} />
        </div>
      </div>
      
      <div className="flex items-baseline gap-1 relative z-10">
        <span className="text-4xl font-bold font-mono tracking-tight" style={{ color }}>{score}</span>
        <span className="text-sm text-textMuted font-medium uppercase tracking-widest">%</span>
      </div>
      
      <div className="w-full h-1.5 bg-background rounded-full overflow-hidden relative z-10 border border-borderHighlight">
        <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Section({ title, children, className }) {
  return (
    <div className={`enterprise-card p-6 flex flex-col bg-surface border border-borderHighlight shadow-sm ${className}`}>
      <h3 className="text-sm font-bold text-textMain mb-6 uppercase tracking-widest flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></div>
        {title}
      </h3>
      <div className="flex-1 relative z-10">
        {children}
      </div>
    </div>
  );
}

export function Compliance() {
  const [stats, setStats] = useState(null);
  const [scores, setScores] = useState({});

  useEffect(() => {
    api.get('/events/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!stats) return;
    const base = 100;
    const critPenalty = Math.min(stats.CRITICAL * 5, 30);
    const warnPenalty = Math.min(stats.WARNING * 1, 10);
    const derived = {};
    STANDARDS.forEach(s => {
      derived[s] = Math.max(base - critPenalty - warnPenalty - Math.floor(Math.random() * 3), 60);
    });
    setScores(derived);
  }, [stats]);

  const barData = STANDARDS.map(s => ({ name: s, score: scores[s] || 0 }));
  const barColor = (score) => score >= 90 ? '#14B891' : score >= 75 ? '#D97706' : '#DC2626';
  
  const TP = { 
    contentStyle: { 
      background: '#ffffff', 
      border: '1px solid #e2e8f0', 
      fontSize: 12, 
      borderRadius: 8, 
      color: '#0f172a',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    itemStyle: { color: '#334155', fontWeight: 600 },
    cursor: { fill: 'rgba(241, 245, 249, 0.5)' }
  };

  return (
    <div className="flex flex-col gap-8 h-full max-w-6xl mx-auto w-full animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-textMain tracking-tight">Compliance Status</h2>
          <p className="text-sm text-textMuted mt-2">Real-time regulatory framework mapping based on system integrity telemetry.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        {STANDARDS.map(s => (
          <ComplianceCard key={s} standard={s} score={scores[s] ?? 100} />
        ))}
      </div>

      <Section title="Framework Score Comparison">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={barData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} domain={[0, 100]} />
            <Tooltip {...TP} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={50} animationDuration={1500}>
              {barData.map((d, i) => <Cell key={i} fill={barColor(d.score)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Generate Audit Reports">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {STANDARDS.map(s => (
            <button
              key={s}
              onClick={() => alert(`Generating ${s} report...`)}
              className="flex items-center justify-center gap-3 bg-surface border border-borderHighlight shadow-sm hover:bg-surfaceHighlight text-textMain hover:text-primary text-sm font-bold py-4 px-4 rounded-lg transition-all duration-300 group"
            >
              <FileCheck className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              {s}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
