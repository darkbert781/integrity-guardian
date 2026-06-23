import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { BrainCircuit, Target, ActivitySquare } from 'lucide-react';

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

  const TP = { contentStyle: { background: '#ffffff', border: '1px solid #e2e8f0', fontSize: 12, borderRadius: 4, color: '#0f172a' } };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-textMain tracking-tight">AI Insights</h2>
          <p className="text-sm text-textMuted mt-1">Isolation Forest anomaly detection & threat clustering</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="enterprise-card p-5 flex flex-col justify-center items-center text-center">
          <BrainCircuit className="w-8 h-8 text-primary mb-3" />
          <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1">Model Status</p>
          <p className="text-lg font-bold text-success">Active & Training</p>
        </div>
        <div className="enterprise-card p-5 flex flex-col justify-center items-center text-center">
          <Target className="w-8 h-8 text-warning mb-3" />
          <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1">Anomaly Score Threshold</p>
          <p className="text-lg font-bold text-textMain">-0.45</p>
        </div>
        <div className="enterprise-card p-5 flex flex-col justify-center items-center text-center">
          <ActivitySquare className="w-8 h-8 text-critical mb-3" />
          <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1">Identified Threats</p>
          <p className="text-lg font-bold text-critical">{insight?.summary?.split(' ')[0] || '0'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[350px]">
        <Section title="Threat Vector Clustering">
          {error ? (
             <div className="flex items-center justify-center h-full text-sm text-red-500 font-medium">Error: {error}</div>
          ) : data.length === 0 ? (
             <div className="flex items-center justify-center h-full text-sm text-textMuted">Gathering model telemetry...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="category" dataKey="name" name="Cluster" stroke="#64748b" tick={{fontSize:11}} />
                <YAxis type="number" dataKey="risk" name="Risk Score" stroke="#64748b" tick={{fontSize:11}} domain={[0, 100]} />
                <ZAxis type="number" dataKey="files" range={[60, 400]} name="Affected Files" />
                <Tooltip cursor={{strokeDasharray: '3 3'}} {...TP} />
                <Scatter name="Anomalies" data={data} fill="#0052cc" />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </Section>
        
        <Section title="AI Diagnostics">
          <div className="bg-[#f8f9fa] border border-border p-4 rounded h-full overflow-auto font-mono text-xs text-textMain">
            {insight ? (
              <pre className="whitespace-pre-wrap">{JSON.stringify(insight, null, 2)}</pre>
            ) : (
              <div className="flex items-center justify-center h-full text-textMuted">Running Isolation Forest Inference...</div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
