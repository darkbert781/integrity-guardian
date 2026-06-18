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
    <div className="flex flex-col h-full gap-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-textMain tracking-tight">Alert Inbox</h2>
          <p className="text-sm text-textMuted mt-1">Actionable security notifications and anomalies</p>
        </div>
        <button 
          onClick={fetchAlerts}
          className="flex items-center gap-2 bg-white border border-border px-4 py-2 rounded text-sm font-medium text-textMain hover:bg-[#f8f9fa] transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
        <div className="enterprise-card p-5 border-l-4 border-l-primary flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1">Total Alerts</p>
            <p className="text-2xl font-bold text-textMain">{alerts.length}</p>
          </div>
          <Bell className="w-8 h-8 text-border" />
        </div>
        <div className="enterprise-card p-5 border-l-4 border-l-critical flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1">Action Required</p>
            <p className="text-2xl font-bold text-critical">{activeAlerts.length}</p>
          </div>
          <ShieldAlert className="w-8 h-8 text-border" />
        </div>
        <div className="enterprise-card p-5 border-l-4 border-l-success flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1">Resolved</p>
            <p className="text-2xl font-bold text-success">{resolvedAlerts.length}</p>
          </div>
          <CheckCircle className="w-8 h-8 text-border" />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : activeAlerts.length === 0 ? (
          <div className="enterprise-card p-12 flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-12 h-12 text-success mb-4" />
            <h3 className="text-lg font-bold text-textMain">All clear</h3>
            <p className="text-sm text-textMuted max-w-sm mt-2">There are no active security alerts. The system is operating normally.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-textMain uppercase tracking-wider">Active Alerts</h3>
            {activeAlerts.map(a => (
              <div key={a.id} className="enterprise-card p-5 flex flex-col md:flex-row gap-6 md:items-center justify-between border-l-4 border-l-critical shadow-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <SeverityBadge severity={a.severity} />
                    <span className="text-xs font-semibold text-textMain">{a.alert_type}</span>
                    <span className="text-xs text-textMuted px-2 border-l border-border">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-textMain font-medium mb-1">{a.message}</p>
                </div>
                
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <button 
                    onClick={() => handleResolve(a.id)}
                    disabled={actioning === a.id}
                    className="w-full bg-primary hover:bg-[#0042a3] text-white text-sm font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
                  >
                    {actioning === a.id ? 'Resolving...' : 'Acknowledge & Resolve'}
                  </button>
                  <button className="w-full bg-white hover:bg-[#f8f9fa] border border-border text-textMain text-sm font-medium py-2 px-4 rounded transition-colors">
                    Investigate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {resolvedAlerts.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-textMuted uppercase tracking-wider mb-4">Recently Resolved</h3>
            <div className="flex flex-col gap-3">
              {resolvedAlerts.slice(0, 5).map(a => (
                <div key={a.id} className="enterprise-card p-4 flex items-center justify-between opacity-75">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-xs font-semibold text-textMain">{a.alert_type}</span>
                    <span className="text-xs text-textMuted truncate max-w-md">{a.message}</span>
                  </div>
                  <span className="text-[10px] text-textMuted">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
