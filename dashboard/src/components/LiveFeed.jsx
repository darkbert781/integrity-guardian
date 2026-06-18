import React, { useEffect, useState } from 'react';
import { wsManager } from '../lib/ws';
import { SeverityBadge } from './SeverityBadge';

/* ── icons ─────────────────────────────────────────────────────────────────── */
const Icon = ({ d, size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  pulse:   'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  file:    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
};

const SEVERITY_COLORS = {
  CRITICAL: 'rgba(239,68,68,0.2)',
  WARNING:  'rgba(245,158,11,0.15)',
  INFO:     'rgba(59,130,246,0.1)',
};

export function LiveFeed() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    wsManager.connect();
    const unsubscribe = wsManager.subscribe((event) => {
      setEvents(prev => [event, ...prev].slice(0, 50)); // Keep last 50
    });
    return unsubscribe;
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 12, opacity: 0.7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1E6FBF', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: 13, color: '#94a3b8' }}>Listening for events...</span>
              </div>
            </div>
          ) : (
            events.map((e, i) => (
              <div 
                key={i} 
                style={{ 
                  background: 'rgba(30,41,59,0.4)', 
                  border: '1px solid rgba(51,65,85,0.4)',
                  borderLeft: `3px solid ${e.severity === 'CRITICAL' ? '#ef4444' : e.severity === 'WARNING' ? '#f59e0b' : '#3b82f6'}`,
                  borderRadius: 8, 
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  animation: i === 0 ? 'slideIn 0.3s ease-out' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <Icon d={ICONS.file} size={14} color="#64748b" />
                  <span style={{ 
                    fontFamily: 'monospace', 
                    fontSize: 11, 
                    color: '#e2e8f0', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis' 
                  }}>
                    {e.file_path}
                  </span>
                </div>
                <SeverityBadge severity={e.severity} />
              </div>
            ))
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
