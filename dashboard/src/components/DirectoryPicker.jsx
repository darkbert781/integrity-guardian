import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Folder, HardDrive, ChevronRight, ChevronLeft, X, Check, AlertCircle } from 'lucide-react';

export function DirectoryPicker({ isOpen, onClose, onSelect }) {
  const [drives, setDrives] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    api.get('/system/drives')
      .then(r => setDrives(r.data.drives || []))
      .catch(() => setError('Failed to load drives'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const navigate = useCallback((path) => {
    setLoading(true);
    setError(null);
    api.get(`/system/browse?path=${encodeURIComponent(path)}`)
      .then(r => {
        if (r.data.error) {
          setError(r.data.error);
          return;
        }
        if (currentPath) setHistory(prev => [...prev, currentPath]);
        setCurrentPath(path);
        setEntries(r.data.entries || []);
      })
      .catch(() => setError('Failed to browse directory'))
      .finally(() => setLoading(false));
  }, [currentPath]);

  const goBack = () => {
    if (history.length === 0) {
      setCurrentPath(null);
      setEntries([]);
      return;
    }
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setLoading(true);
    setError(null);
    api.get(`/system/browse?path=${encodeURIComponent(prev)}`)
      .then(r => {
        setCurrentPath(prev);
        setEntries(r.data.entries || []);
      })
      .finally(() => setLoading(false));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white border border-border rounded shadow-2xl w-[620px] max-h-[75vh] flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-[#f8f9fa]">
          <div className="flex items-center gap-3">
            {currentPath && (
              <button
                onClick={goBack}
                className="p-1.5 rounded hover:bg-[#e2e8f0] transition-colors"
                title="Go back"
              >
                <ChevronLeft className="w-4 h-4 text-textMuted" />
              </button>
            )}
            <div>
              <h3 className="text-sm font-bold text-textMain">Browse for Directory</h3>
              <p className="text-xs text-textMuted font-mono mt-0.5 truncate max-w-[420px]">
                {currentPath || 'Select a drive to begin'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#e2e8f0] transition-colors">
            <X className="w-4 h-4 text-textMuted" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-sm text-textMuted">
              Loading...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-48 gap-2 text-sm text-critical">
              <AlertCircle className="w-5 h-5" /> {error}
            </div>
          ) : !currentPath ? (
            /* Drive list */
            <div className="grid grid-cols-4 gap-2 p-2">
              {drives.map(drive => (
                <button
                  key={drive}
                  onClick={() => navigate(drive)}
                  className="flex flex-col items-center gap-2 p-4 rounded border border-border hover:bg-[#f1f5f9] hover:border-primary transition-colors"
                >
                  <HardDrive className="w-8 h-8 text-primary" />
                  <span className="text-sm font-bold text-textMain">{drive}</span>
                </button>
              ))}
            </div>
          ) : (
            /* Directory entries */
            <div className="flex flex-col gap-0.5">
              {entries.length === 0 && (
                <p className="text-sm text-textMuted text-center py-8">This folder is empty</p>
              )}
              {entries
                .filter(e => e.is_dir)
                .map(entry => (
                  <button
                    key={entry.path}
                    onClick={() => navigate(entry.path)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded hover:bg-[#f1f5f9] text-left group transition-colors"
                  >
                    <Folder className="w-5 h-5 text-warning flex-shrink-0" />
                    <span className="text-sm text-textMain flex-1 truncate">{entry.name}</span>
                    <ChevronRight className="w-4 h-4 text-textMuted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-[#f8f9fa]">
          <p className="text-xs text-textMuted font-mono truncate max-w-[360px]">
            {currentPath ? <><span className="font-bold text-textMain">Selected:</span> {currentPath}</> : 'No folder selected'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded border border-border bg-white text-sm font-medium text-textMain hover:bg-[#f1f5f9] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { if (currentPath) { onSelect(currentPath); onClose(); } }}
              disabled={!currentPath}
              className="flex items-center gap-2 px-4 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-[#0042a3] transition-colors disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              Select This Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
