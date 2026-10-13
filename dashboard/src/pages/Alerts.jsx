import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { Bell, RefreshCw, CheckCircle, ShieldAlert } from 'lucide-react';

export function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);

  const fetchAlerts = useCallback(() => {
    setLoading(true);
    api.get('/alerts/')
      .then(r => setAlerts(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleResolve = (id) => {
    setActioning(id);
    api.put(`/alerts/${id}/resolve`)
      .then(() => fetchAlerts())
      .finally(() => setActioning(null));
  };

  const activeAlerts = alerts.filter(a => a.status === 'NEW');
  const resolvedAlerts = alerts.filter(a => a.status === 'RESOLVED');

  return (
    <div className="flex flex-col h-full gap-8 max-w-6xl mx-auto w-full animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-textMain tracking-tight">Alert Inbox</h2>
          <p className="text-sm text-textMuted mt-2">Actionable security notifications and anomalies requiring immediate attention.</p>
        </div>
        <button 
          onClick={fetchAlerts}
          className="flex items-center gap-2 bg-surface border border-borderHighlight px-4 py-2.5 rounded-lg text-sm font-medium text-textMain hover:bg-surfaceHighlight hover:text-primary transition-all duration-300 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          Refresh Feed
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
        <div className="enterprise-card p-6 bg-surface border border-borderHighlight border-t-4 border-t-primary flex items-center justify-between relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 shadow-sm">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/10 blur-[30px] rounded-full"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-2">Total Alerts</p>
            <p className="text-3xl font-bold text-textMain">{alerts.length}</p>
          </div>
          <Bell className="w-10 h-10 text-primary/30 group-hover:text-primary/70 transition-colors relative z-10" />
        </div>
        <div className="enterprise-card p-6 bg-surface border border-borderHighlight border-t-4 border-t-critical flex items-center justify-between relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 shadow-sm">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-critical/10 blur-[30px] rounded-full"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-critical uppercase tracking-wider mb-2">Action Required</p>
            <p className="text-3xl font-bold text-textMain">{activeAlerts.length}</p>
          </div>
          <ShieldAlert className="w-10 h-10 text-critical/50 group-hover:text-critical transition-colors relative z-10 animate-pulse-slow" />
        </div>
        <div className="enterprise-card p-6 bg-surface border border-borderHighlight border-t-4 border-t-success flex items-center justify-between relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 shadow-sm">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-success/10 blur-[30px] rounded-full"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-2">Resolved</p>
            <p className="text-3xl font-bold text-textMain">{resolvedAlerts.length}</p>
          </div>
          <CheckCircle className="w-10 h-10 text-success/30 group-hover:text-success/70 transition-colors relative z-10" />
        </div>
      </div>

      <div className="flex-1 overflow-auto pr-2 pb-8">
        {loading ? (
          <div className="flex items-center justify-center p-20 flex-col gap-4">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-mono text-textMuted">Syncing alert state...</p>
          </div>
        ) : activeAlerts.length === 0 ? (
          <div className="enterprise-card p-16 flex flex-col items-center justify-center text-center bg-surface border border-borderHighlight shadow-sm">
            <div className="p-5 bg-success/10 rounded-full border border-success/20 mb-6">
              <CheckCircle className="w-12 h-12 text-success" />
            </div>
            <h3 className="text-2xl font-bold text-textMain">All Clear</h3>
            <p className="text-sm text-textMuted max-w-md mt-3 leading-relaxed">There are no active security alerts. The system is operating normally and all assets are secure.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <h3 className="text-sm font-bold text-textMain uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-critical animate-pulse"></span>
              Active Incident Queue
            </h3>
            {activeAlerts.map(a => (
              <div key={a.id} className="enterprise-card p-6 flex flex-col md:flex-row gap-8 md:items-center justify-between border border-borderHighlight border-l-4 border-l-critical bg-surface shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-r from-transparent to-critical/5 pointer-events-none"></div>
                
                <div className="flex-1 relative z-10">
                  <div className="flex items-center gap-4 mb-3">
                    <SeverityBadge severity={a.severity} />
                    <span className="text-[10px] font-bold text-textMain tracking-widest uppercase bg-surfaceHighlight px-2 py-1 rounded border border-borderHighlight">{a.alert_type}</span>
                    <span className="text-xs font-mono text-textMuted pl-2 border-l border-borderHighlight">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-base text-textMain font-medium mb-2 leading-relaxed">{a.message}</p>
                </div>
                
                <div className="flex flex-col gap-3 min-w-[220px] relative z-10">
                  <button 
                    onClick={() => handleResolve(a.id)}
                    disabled={actioning === a.id}
                    className="w-full bg-primary hover:bg-primary/90 text-white shadow-sm text-sm font-bold py-2.5 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
                  >
                    {actioning === a.id ? 'RESOLVING...' : 'ACKNOWLEDGE & RESOLVE'}
                  </button>
                  <button className="w-full bg-surface hover:bg-surfaceHighlight border border-borderHighlight text-textMain shadow-sm text-sm font-bold py-2.5 px-4 rounded-lg transition-colors">
                    INVESTIGATE EVENT
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {resolvedAlerts.length > 0 && (
          <div className="mt-12">
            <h3 className="text-sm font-bold text-textMuted uppercase tracking-widest mb-5 border-b border-borderHighlight pb-2">Recently Resolved</h3>
            <div className="flex flex-col gap-3">
              {resolvedAlerts.slice(0, 5).map(a => (
                <div key={a.id} className="enterprise-card p-4 flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity bg-background border-borderHighlight">
                  <div className="flex items-center gap-4">
                    <div className="bg-success/10 p-1.5 rounded-md">
                      <CheckCircle className="w-4 h-4 text-success" />
                    </div>
                    <span className="text-[10px] font-bold text-textMuted tracking-widest uppercase">{a.alert_type}</span>
                    <span className="text-xs text-textMain truncate max-w-xl">{a.message}</span>
                  </div>
                  <span className="text-[10px] font-mono text-textMuted">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
