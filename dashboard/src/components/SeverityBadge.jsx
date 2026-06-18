import React from 'react';

export function SeverityBadge({ severity }) {
  let styleClass = '';
  let label = severity;

  switch(severity) {
    case 'CRITICAL':
      styleClass = 'bg-[#fef2f2] text-[#991b1b] border-[#f87171]';
      break;
    case 'WARNING':
      styleClass = 'bg-[#fffbeb] text-[#92400e] border-[#fbbf24]';
      break;
    default:
      styleClass = 'bg-[#eff6ff] text-[#1e40af] border-[#93c5fd]';
      label = 'INFO';
  }

  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${styleClass}`}>
      {label}
    </span>
  );
}
