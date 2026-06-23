import React, { useState, useCallback } from 'react';
import api from '../lib/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { DirectoryPicker } from '../components/DirectoryPicker';
import { FileBox, Plus, Search, Lock, Unlock, RefreshCw, FolderOpen, X, Trash2 } from 'lucide-react';

function truncatePath(p) {
  if (!p || p.length < 50) return p;
  const parts = p.split('\\');
  if (parts.length <= 3) return p;
  return `${parts[0]}\\...\\${parts[parts.length - 2]}\\${parts[parts.length - 1]}`;
}

export function FileRegistry() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pendingPaths, setPendingPaths] = useState(['']); // list of paths to register
  const [activeTiers, setActiveTiers] = useState(['standard']);
  const [isRegistering, setIsRegistering] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTargetIndex, setPickerTargetIndex] = useState(0);

  const fetchFiles = useCallback(() => {
    setLoading(true);
    api.get('/files/monitored')
      .then(res => setFiles(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const addPathRow = () => {
    setPendingPaths(prev => [...prev, '']);
    setActiveTiers(prev => [...prev, 'standard']);
  };

  const removePathRow = (idx) => {
    setPendingPaths(prev => prev.filter((_, i) => i !== idx));
    setActiveTiers(prev => prev.filter((_, i) => i !== idx));
  };

  const updatePath = (idx, value) => {
    setPendingPaths(prev => prev.map((p, i) => i === idx ? value : p));
  };

  const updateTier = (idx, value) => {
    setActiveTiers(prev => prev.map((t, i) => i === idx ? value : t));
  };

  const openPickerForIndex = (idx) => {
    setPickerTargetIndex(idx);
    setPickerOpen(true);
  };

  const handlePickerSelect = (path) => {
    updatePath(pickerTargetIndex, path);
  };

  const handleRegisterAll = async () => {
    const toRegister = pendingPaths
      .map((p, i) => ({ path: p.trim(), tier: activeTiers[i] }))
      .filter(x => x.path !== '');

    if (toRegister.length === 0) return;

    setIsRegistering(true);
    let succeeded = 0;
    let failed = [];

    for (const { path, tier } of toRegister) {
      try {
        await api.post(`/files/register?file_path=${encodeURIComponent(path)}&tier=${tier}`);
        succeeded++;
      } catch (err) {
        failed.push(path);
      }
    }

    setIsRegistering(false);
    setPendingPaths(['']);
    setActiveTiers(['standard']);
    fetchFiles();

    if (failed.length > 0) {
      alert(`Registered ${succeeded} path(s). Failed to register:\n${failed.join('\n')}`);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Are you sure you want to delete ALL registered paths?")) return;
    try {
      await api.delete('/files/unregister/all');
      fetchFiles();
    } catch (err) {
      alert("Failed to delete all paths.");
    }
  };

  const handleDelete = async (path) => {
    if (!window.confirm(`Stop monitoring ALL registered paths?`)) return;
    try {
      await api.delete('/files/unregister/all');
      fetchFiles();
    } catch (err) {
      alert("Failed to delete paths.");
    }
  };

  const filtered = files.filter(f =>
    !search || f.file_path?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-6">
      <DirectoryPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-textMain tracking-tight">File Registry</h2>
          <p className="text-sm text-textMuted mt-1">Baseline monitoring configuration</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDeleteAll}
            className="flex items-center gap-2 bg-[#fef2f2] border border-[#f87171] px-4 py-2 rounded text-sm font-medium text-[#991b1b] hover:bg-[#fee2e2] transition-colors shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            Delete All
          </button>
          <button
            onClick={fetchFiles}
            className="flex items-center gap-2 bg-white border border-border px-4 py-2 rounded text-sm font-medium text-textMain hover:bg-[#f8f9fa] transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Registration Panel */}
      <div className="enterprise-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-textMain uppercase tracking-wider">Register Monitored Paths</h3>
          <button
            onClick={addPathRow}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-[#0042a3] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Another Path
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {pendingPaths.map((path, idx) => (
            <div key={idx} className="flex gap-3 items-center">
              <div className="flex-1 flex items-center border border-border rounded bg-[#f8f9fa] px-3 py-2 focus-within:border-primary transition-colors">
                <FileBox className="w-4 h-4 text-textMuted mr-3 flex-shrink-0" />
                <input
                  className="flex-1 bg-transparent border-none outline-none text-sm text-textMain font-mono placeholder-textMuted"
                  placeholder={`C:\\Directory\\to\\monitor`}
                  value={path}
                  onChange={e => updatePath(idx, e.target.value)}
                  disabled={isRegistering}
                />
                <button
                  onClick={() => openPickerForIndex(idx)}
                  disabled={isRegistering}
                  className="ml-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-[#0042a3] border-l border-border pl-3 transition-colors whitespace-nowrap"
                  title="Browse PC for directory"
                >
                  <FolderOpen className="w-4 h-4" />
                  Browse
                </button>
              </div>
              <select
                className="border border-border rounded px-3 py-2 bg-[#f8f9fa] text-sm text-textMain outline-none w-40 focus:border-primary"
                value={activeTiers[idx]}
                onChange={e => updateTier(idx, e.target.value)}
                disabled={isRegistering}
              >
                <option value="critical">Critical</option>
                <option value="standard">Standard</option>
                <option value="informational">Informational</option>
              </select>
              {pendingPaths.length > 1 && (
                <button
                  onClick={() => removePathRow(idx)}
                  className="p-2 rounded border border-border hover:bg-[#fef2f2] hover:border-critical transition-colors"
                >
                  <X className="w-4 h-4 text-textMuted" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleRegisterAll}
            disabled={isRegistering || pendingPaths.every(p => !p.trim())}
            className="flex items-center gap-2 bg-primary hover:bg-[#0042a3] text-white text-sm font-semibold px-6 py-2.5 rounded transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {isRegistering
              ? 'Registering...'
              : `Register ${pendingPaths.filter(p => p.trim()).length} Path(s)`}
          </button>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 enterprise-card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border bg-[#f8f9fa] flex items-center justify-between">
          <div className="flex items-center gap-2 border border-border rounded bg-white px-3 py-1.5 w-64">
            <Search className="w-4 h-4 text-textMuted" />
            <input
              className="bg-transparent border-none outline-none text-xs w-full text-textMain"
              placeholder="Search registered paths..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs font-bold text-textMuted uppercase tracking-wider">{filtered.length} Paths</span>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th className="w-12"></th>
                <th>File Path</th>
                <th>Tier</th>
                <th>Lock Status</th>
                <th className="w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-textMuted text-sm">
                    {search ? 'No paths match your search.' : 'No monitored files found. Register a path above.'}
                  </td>
                </tr>
              ) : (
                filtered.map((f, idx) => (
                  <tr key={idx}>
                    <td className="text-center"><FileBox className="w-4 h-4 text-textMuted inline-block" /></td>
                    <td className="font-mono text-xs">{truncatePath(f.file_path)}</td>
                    <td>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        f.tier === 'critical' ? 'bg-[#fef2f2] text-[#991b1b] border-[#f87171]' :
                        f.tier === 'informational' ? 'bg-[#eff6ff] text-[#1e40af] border-[#93c5fd]' :
                        'bg-[#f8f9fa] text-textMuted border-border'
                      }`}>
                        {f.tier}
                      </span>
                    </td>
                    <td>
                      {f.is_locked ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
                          <Lock className="w-3.5 h-3.5" /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-textMuted">
                          <Unlock className="w-3.5 h-3.5" /> Monitored
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      <button 
                        onClick={() => handleDelete(f.file_path)}
                        className="p-1.5 text-textMuted hover:text-critical rounded hover:bg-[#fef2f2] transition-colors"
                        title="Delete path"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
