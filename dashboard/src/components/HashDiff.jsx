import React from 'react';

export function HashDiff({ oldHash, newHash }) {
  if (!oldHash && !newHash) return null;
  return (
    <div className="bg-gray-800 p-3 rounded text-xs font-mono break-all">
      <div className="text-red-400">- {oldHash || 'null'}</div>
      <div className="text-green-400">+ {newHash || 'null'}</div>
    </div>
  );
}
