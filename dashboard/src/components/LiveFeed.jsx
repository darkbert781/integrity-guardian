import React, { useEffect, useState } from 'react';
import { wsManager } from '../lib/ws';
import { FileText } from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';

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
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="flex flex-col gap-2">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-70">
              <div className="flex items-center gap-2 text-sm text-textMuted">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Listening for events...
              </div>
            </div>
          ) : (
            events.map((e, i) => (
              <div 
                key={i} 
                className={`border border-border rounded p-3 flex items-center justify-between gap-3 bg-[#f8f9fa] ${
                  e.severity === 'CRITICAL' ? 'border-l-4 border-l-critical' : 
                  e.severity === 'WARNING'  ? 'border-l-4 border-l-warning' : 
                  'border-l-4 border-l-primary'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-textMuted flex-shrink-0" />
                  <span className="font-mono text-xs text-textMain whitespace-nowrap overflow-hidden text-ellipsis">
                    {e.file_path}
                  </span>
                </div>
                <SeverityBadge severity={e.severity} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
