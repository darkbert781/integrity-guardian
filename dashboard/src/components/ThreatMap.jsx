import React, { useEffect, useState } from 'react';
import { Target } from 'lucide-react';

export function ThreatMap() {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    // Generate a static network map representing file system areas
    const initialNodes = [
      { id: 1, x: 50, y: 50, label: 'System32', risk: 80, connections: [2, 3] },
      { id: 2, x: 20, y: 80, label: 'Drivers', risk: 20, connections: [1] },
      { id: 3, x: 80, y: 30, label: 'Registry', risk: 40, connections: [1, 4] },
      { id: 4, x: 70, y: 70, label: 'User Data', risk: 10, connections: [3] },
      { id: 5, x: 30, y: 30, label: 'Temp', risk: 90, connections: [1, 2] },
    ];
    setNodes(initialNodes);

    // Simulate pulsing risks
    const interval = setInterval(() => {
      setNodes(prev => prev.map(n => ({
        ...n,
        risk: Math.max(0, Math.min(100, n.risk + (Math.random() * 20 - 10)))
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getNodeColor = (risk) => {
    if (risk > 75) return '#d12223'; // critical
    if (risk > 40) return '#d97706'; // warning
    return '#0a6640'; // success
  };

  return (
    <div className="relative w-full h-full min-h-[250px] bg-[#f8f9fa] rounded border border-border overflow-hidden">
      <svg className="absolute inset-0 w-full h-full">
        {/* Draw edges */}
        {nodes.map(node => 
          node.connections.map(targetId => {
            const target = nodes.find(n => n.id === targetId);
            if (!target) return null;
            return (
              <line 
                key={`${node.id}-${targetId}`}
                x1={`${node.x}%`} y1={`${node.y}%`}
                x2={`${target.x}%`} y2={`${target.y}%`}
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })
        )}
      </svg>
      
      {/* Draw nodes */}
      {nodes.map(node => {
        const color = getNodeColor(node.risk);
        return (
          <div 
            key={node.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 transition-all duration-1000"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <div className="relative">
              {node.risk > 75 && (
                <div 
                  className="absolute inset-0 rounded-full animate-ping opacity-50"
                  style={{ backgroundColor: color }}
                />
              )}
              <div 
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 relative flex items-center justify-center"
                style={{ backgroundColor: color }}
              />
            </div>
            <span className="text-[10px] font-bold text-textMain bg-white/80 px-1 rounded shadow-sm">
              {node.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
