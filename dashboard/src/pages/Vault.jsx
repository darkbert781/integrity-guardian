import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Lock, History, DownloadCloud, FileText, AlertTriangle, Settings as SettingsIcon } from 'lucide-react';

export function Vault() {
  const [vaultFiles, setVaultFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);
  const [search, setSearch] = useState('');
  const [vaultPath, setVaultPath] = useState('');

  const fetchVault = () => {
    setLoading(true);
    api.get('/rollback/vault')
      .then(r => setVaultFiles(r.data.vault_entries || r.data.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const fetchConfig = () => {
    api.get('/settings/')
      .then(r => {
        if (r.data?.config?.vault_dir) {
          setVaultPath(r.data.config.vault_dir);
        } else if (r.data?.config?.vault_path) {
          setVaultPath(r.data.config.vault_path);
        }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchVault();
    fetchConfig();
  }, []);

  const handleRestore = async (id, path) => {
    if (!window.confirm(`Are you sure you want to restore the file at:\n${path}\nThis will overwrite the current active file.`)) {
      return;
    }

    setRestoringId(id);
    try {
      const res = await api.post(`/rollback/${id}`);
      if (res.data.success) {
        alert('File restored successfully!');
        fetchVault();
      } else {
        alert(`Restore failed: ${res.data.error}`);
      }
    } catch (err) {
      alert(`Restore failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setRestoringId(null);
    }
  };

  const filtered = vaultFiles.filter(f => 
    !search || f.original_path?.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfigurePath = async () => {
    const newPath = window.prompt("Enter new absolute path for Vault storage:", vaultPath);
    if (newPath !== null && newPath.trim() !== "") {
      try {
        // Fetch current settings first to merge
        const r = await api.get('/settings/');
        const currentConfig = r.data.config || {};
        const updatedConfig = { ...currentConfig, vault_dir: newPath.trim() };
        await api.put('/settings/', updatedConfig);
        setVaultPath(newPath.trim());
      } catch (err) {
        alert("Failed to update vault path");
      }
    }
  };

  return (
    <div className="flex flex-col h-full gap-8 animate-fade-in-up">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-textMain tracking-tight">Encrypted Vault</h2>
          <p className="text-sm text-textMuted mt-2 max-w-xl leading-relaxed">
            AES-256 encrypted last-known-good snapshots. Snapshots are automatically taken for Critical-tier files before modification or deletion.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-surface border border-borderHighlight rounded-lg px-4 py-2.5 w-full md:w-80 shadow-sm">
          <FileText className="w-4 h-4 text-primary" />
          <input
            className="bg-transparent border-none outline-none text-sm w-full text-textMain placeholder-textMuted font-mono"
            placeholder="Search vault paths..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Vault Configuration Card */}
      <div className="enterprise-card p-6 bg-surface border border-borderHighlight shadow-md border-l-4 border-l-secondary relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-secondary/10 blur-[50px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-start justify-between relative z-10">
          <div className="flex gap-4">
            <div className="p-3 bg-background rounded-xl h-fit border border-borderHighlight">
              <SettingsIcon className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-textMain tracking-wider uppercase">Vault Storage Settings</h3>
              <p className="text-xs text-textMuted mt-1">Specify the physical disk location where encrypted snapshots are saved.</p>
              
              <div className="mt-5 flex items-center gap-3">
                <label className="text-xs font-semibold text-textMuted uppercase">Current Path:</label>
                <div className="flex items-center gap-2 bg-background border border-borderHighlight rounded-md px-3 py-1.5 font-mono text-sm text-textMain max-w-md overflow-hidden text-ellipsis whitespace-nowrap">
                  <Lock className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
                  {vaultPath || 'Not Configured'}
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={handleConfigurePath}
            className="bg-surface border border-borderHighlight hover:bg-surfaceHighlight hover:border-secondary/50 text-textMain text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-300 shadow-sm flex items-center gap-2 group whitespace-nowrap">
             Configure Path
          </button>
        </div>
      </div>

      {/* Vault Table */}
      <div className="flex-1 enterprise-card flex flex-col overflow-hidden border border-borderHighlight shadow-md bg-surface">
        <div className="p-5 border-b border-borderHighlight bg-surfaceHighlight flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm font-bold text-textMain tracking-widest uppercase">
            <div className="relative">
              <Lock className="w-5 h-5 text-primary relative z-10" />
            </div>
            Secured Snapshots
          </div>
          <div className="bg-background border border-borderHighlight px-3 py-1 rounded-full">
            <span className="text-xs font-bold text-primary">{filtered.length} IN VAULT</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-surface">
          {loading ? (
            <div className="flex items-center justify-center p-20 flex-col gap-4">
              <History className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-textMuted font-mono">Decrypting vault manifest...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-24 text-center">
              <div className="p-6 bg-background rounded-full border border-borderHighlight mb-6 relative">
                <Lock className="w-12 h-12 text-borderHighlight relative z-10" />
                <div className="absolute inset-0 bg-borderHighlight/20 blur-xl"></div>
              </div>
              <h3 className="text-xl font-bold text-textMain">Vault is empty</h3>
              <p className="text-sm text-textMuted mt-3 max-w-md">No encrypted snapshots exist in the vault. The system will automatically secure critical files upon detection of tampering.</p>
            </div>
          ) : (
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th className="w-12 text-center">#</th>
                  <th>Original Path</th>
                  <th>Snapshot Hash</th>
                  <th>Encrypted Size</th>
                  <th>Stored Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, i) => (
                  <tr key={f.id} className="group">
                    <td className="text-center">
                      <span className="text-xs font-mono text-textMuted">{i + 1}</span>
                    </td>
                    <td className="font-mono text-xs text-textMain tracking-tight">
                      {f.original_path}
                    </td>
                    <td className="font-mono text-xs text-textMuted group-hover:text-primary transition-colors">
                      {f.file_hash?.substring(0, 16)}...
                    </td>
                    <td className="text-xs text-textMuted font-mono">
                      <span className="bg-background px-2 py-1 rounded border border-borderHighlight">
                        {(f.size_bytes / 1024).toFixed(1)} KB
                      </span>
                    </td>
                    <td className="text-xs text-textMuted">
                      {new Date(f.created_at).toLocaleString(undefined, { 
                        year: 'numeric', month: 'short', day: 'numeric', 
                        hour: '2-digit', minute:'2-digit', second:'2-digit' 
                      })}
                    </td>
                    <td className="text-right">
                      <button 
                        onClick={() => handleRestore(f.id, f.original_path)}
                        disabled={restoringId === f.id}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 py-2 rounded-md transition-all duration-300 disabled:opacity-50 shadow-sm"
                      >
                        {restoringId === f.id ? (
                          <History className="w-4 h-4 animate-spin" />
                        ) : (
                          <DownloadCloud className="w-4 h-4" />
                        )}
                        {restoringId === f.id ? 'DECRYPTING...' : 'RESTORE'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
