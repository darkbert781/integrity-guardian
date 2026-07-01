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
    if (!window.confirm(`Stop monitoring ${path}?`)) return;
    try {
      await api.delete(`/files/unregister?file_path=${encodeURIComponent(path)}`);
      fetchFiles();
    } catch (err) {
      alert("Failed to delete path.");
    }
  };

  const filtered = files.filter(f =>
    !search || f.file_path?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-8 animate-fade-in-up">
      <DirectoryPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-textMain tracking-tight">File Registry</h2>
          <p className="text-sm text-textMuted mt-2">Kernel-level baseline monitoring asset configuration.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDeleteAll}
            className="flex items-center gap-2 bg-critical/10 border border-critical/30 px-5 py-2.5 rounded-lg text-sm font-bold text-critical hover:bg-critical hover:text-white transition-all duration-300 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            PURGE ALL
          </button>
          <button
            onClick={fetchFiles}
            className="flex items-center gap-2 bg-surface border border-borderHighlight px-5 py-2.5 rounded-lg text-sm font-bold text-textMain hover:bg-surfaceHighlight hover:text-primary transition-all duration-300 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            REFRESH
          </button>
        </div>
      </div>

      {/* Registration Panel */}
      <div className="enterprise-card p-6 bg-surface border border-borderHighlight shadow-md border-l-4 border-l-secondary relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-secondary/10 blur-[50px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <h3 className="text-sm font-bold text-textMain uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></div>
            Register Monitored Assets
          </h3>
          <button
            onClick={addPathRow}
            className="flex items-center gap-2 text-xs font-bold text-white transition-colors bg-secondary hover:bg-secondary/90 px-3 py-1.5 rounded-md shadow-sm"
          >
            <Plus className="w-4 h-4" />
            ADD ASSET
          </button>
        </div>

        <div className="flex flex-col gap-4 relative z-10">
          {pendingPaths.map((path, idx) => (
            <div key={idx} className="flex gap-4 items-center group">
              <div className="flex-1 flex items-center border border-borderHighlight rounded-lg bg-surface shadow-sm px-4 py-2.5 focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20 transition-all duration-300">
                <FileBox className="w-5 h-5 text-textMuted mr-3 flex-shrink-0 group-hover:text-secondary transition-colors" />
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
                  className="ml-3 flex items-center gap-1.5 text-xs font-bold text-textMuted hover:text-secondary border-l border-borderHighlight pl-4 transition-colors whitespace-nowrap"
                  title="Browse PC for directory"
                >
                  <FolderOpen className="w-4 h-4" />
                  BROWSE
                </button>
              </div>
              <select
                className="border border-borderHighlight rounded-lg px-4 py-3 bg-surface shadow-sm text-sm text-textMain font-bold uppercase tracking-wider outline-none w-48 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                value={activeTiers[idx]}
                onChange={e => updateTier(idx, e.target.value)}
                disabled={isRegistering}
              >
                <option value="critical">CRITICAL</option>
                <option value="standard">STANDARD</option>
                <option value="informational">INFO</option>
              </select>
              {pendingPaths.length > 1 && (
                <button
                  onClick={() => removePathRow(idx)}
                  className="p-3 rounded-lg border border-borderHighlight bg-surface hover:bg-critical hover:border-critical hover:text-white transition-all text-textMuted shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end relative z-10">
          <button
            onClick={handleRegisterAll}
            disabled={isRegistering || pendingPaths.every(p => !p.trim())}
            className="flex items-center gap-2 bg-secondary hover:bg-secondary/90 text-white shadow-sm text-sm font-bold px-8 py-3 rounded-lg transition-all duration-300 disabled:opacity-50 uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            {isRegistering
              ? 'COMMITTING...'
              : `COMMIT ${pendingPaths.filter(p => p.trim()).length} ASSET(S)`}
          </button>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 enterprise-card flex flex-col overflow-hidden shadow-md border border-borderHighlight bg-surface">
        <div className="p-5 border-b border-borderHighlight bg-surfaceHighlight flex items-center justify-between">
          <div className="flex items-center gap-3 bg-surface border border-borderHighlight rounded-lg px-4 py-2.5 w-80 shadow-sm focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="w-4 h-4 text-primary" />
            <input
              className="bg-transparent border-none outline-none text-sm w-full text-textMain placeholder-textMuted font-mono"
              placeholder="Search active telemetry paths..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="bg-background border border-borderHighlight px-3 py-1 rounded-full">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">{filtered.length} ASSETS ACTIVE</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-surface">
          <table className="enterprise-table relative">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="w-12 text-center"></th>
                <th>Monitored Asset Path</th>
                <th>Protection Tier</th>
                <th>Security Lock</th>
                <th className="w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-24 text-textMuted">
                    <div className="flex flex-col items-center gap-4 opacity-50">
                      <FileBox className="w-12 h-12" />
                      <p className="text-lg font-bold text-textMain">{search ? 'No assets match query.' : 'No telemetry assets found.'}</p>
                      <p className="text-sm">Register a path above to begin monitoring.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((f, idx) => (
                  <tr key={idx} className="group hover:bg-surfaceHighlight/30 transition-colors">
                    <td className="text-center">
                      <FileBox className="w-4 h-4 text-textMuted inline-block group-hover:text-primary transition-colors" />
                    </td>
                    <td className="font-mono text-xs text-textMain tracking-tight group-hover:text-primary transition-colors">{truncatePath(f.file_path)}</td>
                    <td>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border ${
                        f.tier === 'critical' ? 'bg-critical/10 text-critical border-critical/30' :
                        f.tier === 'informational' ? 'bg-primary/10 text-primary border-primary/30' :
                        'bg-surfaceHighlight text-textMuted border-borderHighlight'
                      }`}>
                        {f.tier}
                      </span>
                    </td>
                    <td>
                      {f.is_locked ? (
                        <span className="inline-flex items-center gap-2 text-xs font-bold text-success uppercase tracking-widest bg-success/10 px-2 py-1 rounded border border-success/20">
                          <Lock className="w-3.5 h-3.5" /> Secured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-xs font-bold text-textMuted uppercase tracking-widest bg-surfaceHighlight px-2 py-1 rounded border border-borderHighlight">
                          <Unlock className="w-3.5 h-3.5" /> Monitored
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      <button 
                        onClick={() => handleDelete(f.file_path)}
                        className="p-2 text-textMuted hover:text-critical rounded hover:bg-critical/20 transition-all border border-transparent hover:border-critical/30"
                        title="Remove telemetry asset"
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
