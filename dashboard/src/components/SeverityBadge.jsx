import React from 'react';

export function SeverityBadge({ severity }) {
  const colors = {
    INFO: 'bg-blue-500 text-white',
    WARNING: 'bg-warning text-white',
    CRITICAL: 'bg-critical text-white'
  };
  return (
    <span className={`px-2 py-1 text-xs font-bold rounded ${colors[severity] || colors.INFO}`}>
      {severity}
    </span>
  );
}
