import React from 'react';

export function ComplianceCard({ standard, score }) {
  return (
    <div className="bg-surface p-4 rounded-lg border border-gray-700">
      <h4 className="font-bold text-lg">{standard}</h4>
      <div className="text-3xl font-light text-primary my-2">{score}%</div>
      <button className="text-sm bg-primary px-3 py-1 rounded hover:bg-blue-600 transition">
        Generate Report
      </button>
    </div>
  );
}
