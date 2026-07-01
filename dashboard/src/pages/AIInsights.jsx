import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { BrainCircuit, Target, ActivitySquare } from 'lucide-react';

function Section({ title, children, className }) {
  return (
    <div className={`enterprise-card p-6 flex flex-col bg-surface border border-borderHighlight shadow-sm ${className}`}>
      <h3 className="text-sm font-bold text-textMain uppercase tracking-widest mb-6 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></div>
        {title}
      </h3>
      <div className="flex-1 relative z-10">
        {children}
      </div>
    </div>
  );
}

export function AIInsights() {
  const [insight, setInsight] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.post('/events/analyze')
      .then(r => {
        setInsight(r.data);
        setError(null);
      })
      .catch(e => {
        setError(e.response?.data?.detail || e.message);
      });
  }, []);

  const data = insight?.clusters || [];

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
    <div className="flex flex-col h-full gap-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-textMain tracking-tight">AI Insights</h2>
          <p className="text-sm text-textMuted mt-2">Isolation Forest anomaly detection & threat clustering telemetry.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="enterprise-card p-6 flex flex-col justify-center items-center text-center border-t-4 border-t-primary border border-borderHighlight bg-surface shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors pointer-events-none"></div>
          <div className="p-3 bg-background rounded-full mb-4 border border-borderHighlight group-hover:scale-110 transition-transform">
            <BrainCircuit className="w-8 h-8 text-primary" />
          </div>
          <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-1 relative z-10">Model Status</p>
          <p className="text-xl font-bold text-success relative z-10">Active & Training</p>
        </div>
        
        <div className="enterprise-card p-6 flex flex-col justify-center items-center text-center border-t-4 border-t-warning border border-borderHighlight bg-surface shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-warning/5 group-hover:bg-warning/10 transition-colors pointer-events-none"></div>
          <div className="p-3 bg-background rounded-full mb-4 border border-borderHighlight group-hover:scale-110 transition-transform">
            <Target className="w-8 h-8 text-warning" />
          </div>
          <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-1 relative z-10">Anomaly Threshold</p>
          <p className="text-xl font-bold text-textMain font-mono relative z-10">-0.45</p>
        </div>
        
        <div className="enterprise-card p-6 flex flex-col justify-center items-center text-center border-t-4 border-t-critical border border-borderHighlight bg-surface shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-critical/5 group-hover:bg-critical/10 transition-colors pointer-events-none"></div>
          <div className="p-3 bg-background rounded-full mb-4 border border-borderHighlight group-hover:scale-110 transition-transform">
            <ActivitySquare className="w-8 h-8 text-critical" />
          </div>
          <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-1 relative z-10">Identified Threats</p>
          <p className="text-xl font-bold text-critical relative z-10">{insight?.summary?.split(' ')[0] || '0'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[350px]">
        <Section title="Threat Vector Clustering">
          {error ? (
             <div className="flex items-center justify-center h-full text-sm text-critical font-medium bg-critical/10 rounded-lg border border-critical/20 p-4">{error}</div>
          ) : data.length === 0 ? (
             <div className="flex items-center justify-center h-full text-sm text-textMuted font-mono">Gathering model telemetry...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="category" dataKey="name" name="Cluster" stroke="#64748b" tick={{fontSize:11, fill: '#64748b'}} />
                <YAxis type="number" dataKey="risk" name="Risk Score" stroke="#64748b" tick={{fontSize:11, fill: '#64748b'}} domain={[0, 100]} />
                <ZAxis type="number" dataKey="files" range={[100, 500]} name="Affected Files" />
                <Tooltip cursor={{strokeDasharray: '3 3', stroke: '#cbd5e1'}} {...TP} />
                <Scatter name="Anomalies" data={data} fill="#14B891" />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </Section>
        
        <Section title="AI Diagnostics">
          <div className="bg-background border border-borderHighlight p-5 rounded-lg h-full overflow-auto font-mono text-xs text-secondary/90 shadow-inner">
            {insight ? (
              <pre className="whitespace-pre-wrap">{JSON.stringify(insight, null, 2)}</pre>
            ) : (
              <div className="flex flex-col gap-3 items-center justify-center h-full text-primary">
                <BrainCircuit className="w-8 h-8 animate-pulse" />
                Running Isolation Forest Inference...
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
