import React, { useState, useCallback } from 'react';
import api from '../lib/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { DirectoryPicker } from '../components/DirectoryPicker';
import { AclManagerModal } from '../components/AclManagerModal';
import {
  FileBox,
  Plus,
  Search,
  Lock,
  Unlock,
  RefreshCw,
  FolderOpen,
  X,
  Trash2,
  Key,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Sliders
} from 'lucide-react';

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
  const [pendingPaths, setPendingPaths] = useState(['']);
  const [activeTiers, setActiveTiers] = useState(['standard']);
  const [pendingPasswords, setPendingPasswords] = useState(['']);
  const [isRegistering, setIsRegistering] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTargetIndex, setPickerTargetIndex] = useState(0);

  // ACL Manager Modal state
  const [aclModalOpen, setAclModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Quick Unlock Modal state
  const [quickUnlockOpen, setQuickUnlockOpen] = useState(false);
  const [quickUnlockAsset, setQuickUnlockAsset] = useState(null);
  const [quickUnlockPassword, setQuickUnlockPassword] = useState('');
  const [quickUnlockError, setQuickUnlockError] = useState('');
  const [quickUnlocking, setQuickUnlocking] = useState(false);

  // Notification message
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

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
    setPendingPasswords(prev => [...prev, '']);
  };

  const removePathRow = (idx) => {
    setPendingPaths(prev => prev.filter((_, i) => i !== idx));
    setActiveTiers(prev => prev.filter((_, i) => i !== idx));
    setPendingPasswords(prev => prev.filter((_, i) => i !== idx));
  };

  const updatePath = (idx, value) => {
    setPendingPaths(prev => prev.map((p, i) => i === idx ? value : p));
  };

  const updateTier = (idx, value) => {
    setActiveTiers(prev => prev.map((t, i) => i === idx ? value : t));
  };

  const updatePassword = (idx, value) => {
    setPendingPasswords(prev => prev.map((p, i) => i === idx ? value : p));
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
      .map((p, i) => ({
        path: p.trim(),
        tier: activeTiers[i],
        password: pendingPasswords[i]?.trim() || ''
      }))
      .filter(x => x.path !== '');

    if (toRegister.length === 0) return;

    setIsRegistering(true);
    let succeeded = 0;
    let failed = [];

    for (const { path, tier, password } of toRegister) {
      try {
        let url = `/files/register?file_path=${encodeURIComponent(path)}&tier=${tier}`;
        if (password) {
          url += `&unlock_password=${encodeURIComponent(password)}`;
        }
        await api.post(url);
        succeeded++;
      } catch (err) {
        failed.push(path);
      }
    }

    setIsRegistering(false);
    setPendingPaths(['']);
    setActiveTiers(['standard']);
    setPendingPasswords(['']);
    fetchFiles();

    if (failed.length > 0) {
      alert(`Registered ${succeeded} path(s). Failed to register:\n${failed.join('\n')}`);
    } else {
      showToast(`Successfully registered ${succeeded} monitored asset(s). Critical assets auto-locked.`);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Are you sure you want to delete ALL registered paths?")) return;
    try {
      await api.delete('/files/unregister/all');
      fetchFiles();
      showToast("All monitored assets cleared.");
    } catch (err) {
      alert("Failed to delete all paths.");
    }
  };

  const handleDelete = async (path) => {
    if (!window.confirm(`Stop monitoring ${path}?`)) return;
    try {
      await api.delete(`/files/unregister?file_path=${encodeURIComponent(path)}`);
      fetchFiles();
      showToast(`Removed ${path} from monitored assets.`);
    } catch (err) {
      alert("Failed to delete path.");
    }
  };

  // Instant Lock Action
  const handleQuickLock = async (asset) => {
    try {
      await api.post('/access/lock', { path: asset.file_path });
      fetchFiles();
      showToast(`🔒 Locked: DENY Write applied to ${truncatePath(asset.file_path)}`);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to lock asset.");
    }
  };

  // Instant Unlock Action (prompts for password if protected)
  const handleLockToggleClick = (asset) => {
    if (asset.is_locked) {
      // Need to unlock
      if (asset.has_password) {
        setQuickUnlockAsset(asset);
        setQuickUnlockPassword('');
        setQuickUnlockError('');
        setQuickUnlockOpen(true);
      } else {
        if (window.confirm(`Unlock write access for ${asset.file_path}?`)) {
          api.post('/access/unlock', { path: asset.file_path })
            .then(() => {
              fetchFiles();
              showToast(`🔓 Unlocked: Write access restored for ${truncatePath(asset.file_path)}`);
            })
            .catch(err => alert(err.response?.data?.detail || "Failed to unlock asset."));
        }
      }
    } else {
      // Need to lock
      handleQuickLock(asset);
    }
  };

  const handleExecuteQuickUnlock = async (e) => {
    e.preventDefault();
    if (!quickUnlockAsset) return;
    setQuickUnlocking(true);
    setQuickUnlockError('');

    try {
      await api.post('/access/unlock', {
        path: quickUnlockAsset.file_path,
        password: quickUnlockPassword || undefined
      });
      setQuickUnlockOpen(false);
      fetchFiles();
      showToast(`🔓 Unlocked: ${truncatePath(quickUnlockAsset.file_path)} write access restored.`);
    } catch (err) {
      setQuickUnlockError(err.response?.data?.detail || "Incorrect unlock password.");
    } finally {
      setQuickUnlocking(false);
    }
  };

  const openAclModal = (asset) => {
    setSelectedAsset(asset);
    setAclModalOpen(true);
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

      <AclManagerModal
        isOpen={aclModalOpen}
        onClose={() => setAclModalOpen(false)}
        asset={selectedAsset}
        onRefresh={fetchFiles}
      />

      {/* Quick Unlock Password Dialog */}
      {quickUnlockOpen && quickUnlockAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-borderHighlight rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-borderHighlight flex items-center justify-between bg-surfaceHighlight/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-critical/10 text-critical">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-textMain tracking-tight">Protected Asset Unlock</h3>
                  <p className="text-[11px] font-mono text-textMuted mt-0.5 truncate max-w-xs">{quickUnlockAsset.file_path}</p>
                </div>
              </div>
              <button
                onClick={() => setQuickUnlockOpen(false)}
                className="p-1.5 text-textMuted hover:text-textMain rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteQuickUnlock} className="p-6 flex flex-col gap-4">
              {quickUnlockError && (
                <div className="p-3 bg-critical/10 border border-critical/30 rounded-lg flex items-center gap-2.5 text-xs text-critical font-medium">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{quickUnlockError}</span>
                </div>
              )}

              <p className="text-xs text-textMuted leading-relaxed">
                This critical folder is protected with a dedicated unlock password. Enter it below to remove the NTFS DENY ACL:
              </p>

              <div>
                <label className="block text-[11px] font-bold text-textMuted uppercase tracking-wider mb-1.5">
                  Unlock Password
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={quickUnlockPassword}
                  onChange={(e) => setQuickUnlockPassword(e.target.value)}
                  placeholder="Enter folder unlock password"
                  className="w-full bg-surface border border-borderHighlight rounded-lg px-4 py-2.5 text-xs text-textMain font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickUnlockOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-textMuted hover:text-textMain uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickUnlocking || !quickUnlockPassword}
                  className="flex items-center gap-2 bg-critical hover:bg-critical/90 text-white text-xs font-bold py-2.5 px-6 rounded-lg uppercase tracking-widest disabled:opacity-50 shadow-sm"
                >
                  <Unlock className={`w-3.5 h-3.5 ${quickUnlocking ? 'animate-spin' : ''}`} />
                  {quickUnlocking ? 'Verifying...' : 'Unlock Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border animate-fade-in bg-surface border-success/30 text-textMain">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          <span className="text-xs font-medium">{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-textMain tracking-tight">File Registry & Access Control</h2>
          <p className="text-sm text-textMuted mt-2">Manage monitored assets, automated NTFS protection, and folder ACLs.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDeleteAll}
            className="flex items-center gap-2 bg-critical/10 border border-critical/30 px-5 py-2.5 rounded-lg text-sm font-bold text-critical hover:bg-critical hover:text-white transition-all duration-300 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            Delete All
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
          {pendingPaths.map((path, idx) => {
            const isCrit = activeTiers[idx] === 'critical';
            return (
              <div key={idx} className="flex flex-col gap-2 p-3 rounded-xl border border-borderHighlight/60 bg-surfaceHighlight/20">
                <div className="flex gap-4 items-center group">
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

                {/* Critical Tier Options & Auto-Lock Banner */}
                {isCrit && (
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-1 px-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-critical bg-critical/5 border border-critical/20 px-3 py-2 rounded-lg flex-shrink-0">
                      <ShieldAlert className="w-4 h-4 text-critical flex-shrink-0" />
                      <span>Auto-Lock Active: NTFS write deny automatically applied upon registration.</span>
                    </div>

                    <div className="flex-1 flex items-center gap-2 w-full">
                      <div className="flex-1 flex items-center border border-borderHighlight rounded-lg bg-surface px-3 py-1.5 shadow-sm focus-within:border-primary">
                        <Key className="w-4 h-4 text-textMuted mr-2 flex-shrink-0" />
                        <input
                          type="password"
                          className="flex-1 bg-transparent border-none outline-none text-xs text-textMain font-mono placeholder-textMuted"
                          placeholder="Unlock Password / PIN (Optional)"
                          value={pendingPasswords[idx] || ''}
                          onChange={e => updatePassword(idx, e.target.value)}
                          disabled={isRegistering}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
              placeholder="Search monitored files..."
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
                <th>Password Protection</th>
                <th className="w-32 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-24 text-textMuted">
                    <div className="flex flex-col items-center gap-4 opacity-50">
                      <FileBox className="w-12 h-12" />
                      <p className="text-lg font-bold text-textMain">{search ? 'No files match your search.' : 'No files found.'}</p>
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
                    <td className="font-mono text-xs text-textMain tracking-tight group-hover:text-primary transition-colors">
                      {truncatePath(f.file_path)}
                    </td>
                    <td>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border ${
                        f.tier === 'critical' ? 'bg-critical/10 text-critical border-critical/30' :
                        f.tier === 'informational' ? 'bg-primary/10 text-primary border-primary/30' :
                        'bg-surfaceHighlight text-textMuted border-borderHighlight'
                      }`}>
                        {f.tier}
                      </span>
                    </td>

                    {/* Instant Lock Status Toggle */}
                    <td>
                      {f.is_locked ? (
                        <button
                          onClick={() => handleLockToggleClick(f)}
                          className="inline-flex items-center gap-2 text-xs font-bold text-success uppercase tracking-wider bg-success/10 hover:bg-success/20 px-3 py-1.5 rounded-lg border border-success/30 transition-all shadow-sm"
                          title="Click to unlock write access"
                        >
                          <Lock className="w-3.5 h-3.5 text-success" />
                          <span>Locked (DENY Write)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLockToggleClick(f)}
                          className="inline-flex items-center gap-2 text-xs font-bold text-textMuted hover:text-textMain uppercase tracking-wider bg-surfaceHighlight hover:bg-surfaceHighlight/80 px-3 py-1.5 rounded-lg border border-borderHighlight transition-all shadow-sm"
                          title="Click to lock with NTFS DENY Write ACL"
                        >
                          <Unlock className="w-3.5 h-3.5 text-textMuted" />
                          <span>Unlocked</span>
                        </button>
                      )}
                    </td>

                    {/* Password Protection Badge */}
                    <td>
                      {f.has_password ? (
                        <button
                          onClick={() => openAclModal(f)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-md border border-primary/30 transition-colors"
                          title="Unlock password is configured. Click to manage."
                        >
                          <Key className="w-3.5 h-3.5 text-primary" />
                          <span>Protected</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => openAclModal(f)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-textMuted hover:text-textMain bg-surfaceHighlight px-2.5 py-1 rounded-md border border-borderHighlight transition-colors"
                          title="No password set. Click to configure."
                        >
                          <Key className="w-3.5 h-3.5 opacity-40" />
                          <span>None</span>
                        </button>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openAclModal(f)}
                          className="p-2 text-textMuted hover:text-primary rounded-lg hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20"
                          title="Manage ACL and Folder Security"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(f.file_path)}
                          className="p-2 text-textMuted hover:text-critical rounded-lg hover:bg-critical/20 transition-all border border-transparent hover:border-critical/30"
                          title="Stop monitoring file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
