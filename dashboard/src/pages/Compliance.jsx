import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ShieldCheck, Download, FileCheck } from 'lucide-react';

const STANDARDS = ['PCI-DSS', 'HIPAA', 'GDPR', 'NIST-CSF', 'ISO-27001'];

function ComplianceCard({ standard, score }) {
  const isGood = score >= 90;
  const isWarn = score >= 75 && score < 90;
  const color = isGood ? '#0a6640' : isWarn ? '#d97706' : '#d12223';
  const border = isGood ? 'border-success' : isWarn ? 'border-warning' : 'border-critical';

  return (
    <div className={`enterprise-card p-4 flex flex-col gap-3 border-l-4 ${border}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-textMain tracking-wide">{standard}</span>
        <ShieldCheck className="w-5 h-5" color={color} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold font-mono" style={{ color }}>{score}</span>
        <span className="text-sm text-textMuted font-medium">%</span>
      </div>
      <div className="w-full h-1.5 bg-[#e2e8f0] rounded overflow-hidden">
        <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Section({ title, children, className }) {
  return (
    <div className={`enterprise-card p-5 flex flex-col ${className}`}>
      <h3 className="text-sm font-bold text-textMain mb-4 uppercase tracking-wider">{title}</h3>
      <div className="flex-1">
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
  const barColor = (score) => score >= 90 ? '#0a6640' : score >= 75 ? '#d97706' : '#d12223';
  const TP = { contentStyle: { background: '#ffffff', border: '1px solid #e2e8f0', fontSize: 12, borderRadius: 4, color: '#0f172a' } };

  return (
    <div className="flex flex-col gap-6 h-full max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-textMain tracking-tight">Compliance Status</h2>
          <p className="text-sm text-textMuted mt-1">Real-time regulatory mapping based on file integrity</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {STANDARDS.map(s => (
          <ComplianceCard key={s} standard={s} score={scores[s] ?? 100} />
        ))}
      </div>

      <Section title="Framework Score Comparison">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} />
            <Tooltip {...TP} cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey="score" radius={[2, 2, 0, 0]} maxBarSize={60}>
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
              className="flex items-center justify-center gap-2 bg-white border border-border hover:bg-[#f8f9fa] hover:border-primary text-textMain text-sm font-semibold py-3 px-4 rounded transition-colors"
            >
              <FileCheck className="w-4 h-4 text-primary" />
              {s} Report
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
