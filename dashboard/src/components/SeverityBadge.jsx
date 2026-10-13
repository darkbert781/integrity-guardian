import React from 'react';

export function SeverityBadge({ severity }) {
  let styleClass = '';
  let label = severity;

  switch(severity) {
    case 'CRITICAL':
      styleClass = 'bg-[#FDECEC] text-[#DC2626] border-[#FCA5A5]';
      break;
    case 'WARNING':
      styleClass = 'bg-[#FDF3E2] text-[#D97706] border-[#FCD34D]';
      break;
    default:
      styleClass = 'bg-[#E6F2FA] text-[#0284C7] border-[#7DD3FC]';
      label = 'INFO';
  }

  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${styleClass}`}>
      {label}
    </span>
  );
}
