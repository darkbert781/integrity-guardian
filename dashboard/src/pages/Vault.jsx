import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Lock, History, DownloadCloud, FileText, AlertTriangle } from 'lucide-react';

export function Vault() {
  const [vaultFiles, setVaultFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);
  const [search, setSearch] = useState('');

  const fetchVault = () => {
    setLoading(true);
    api.get('/rollback/vault')
      .then(r => setVaultFiles(r.data.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVault();
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

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-textMain tracking-tight">Encrypted Vault</h2>
          <p className="text-sm text-textMuted mt-1">AES-256 encrypted last-known-good snapshots</p>
        </div>
        <div className="flex items-center gap-2 border border-border rounded bg-white px-3 py-2 w-72">
          <FileText className="w-4 h-4 text-textMuted" />
          <input
            className="bg-transparent border-none outline-none text-sm w-full text-textMain"
            placeholder="Search vault paths..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 enterprise-card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border bg-[#f8f9fa] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-textMain uppercase tracking-wider">
            <Lock className="w-4 h-4 text-textMuted" />
            Secured Snapshots
          </div>
          <span className="text-xs font-bold text-textMuted uppercase tracking-wider">{filtered.length} Items</span>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <History className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <Lock className="w-12 h-12 text-border mb-4" />
              <h3 className="text-lg font-bold text-textMain">Vault is empty</h3>
              <p className="text-sm text-textMuted mt-2">No encrypted snapshots exist in the vault.</p>
            </div>
          ) : (
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th className="w-12"></th>
                  <th>Original Path</th>
                  <th>Vault Version ID</th>
                  <th>Encrypted Size</th>
                  <th>Stored Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td className="text-center">
                      <Lock className="w-4 h-4 text-textMuted inline-block" />
                    </td>
                    <td className="font-mono text-xs">{f.original_path}</td>
                    <td className="font-mono text-xs text-textMuted">{f.version_id || f.id}</td>
                    <td className="text-xs">{(f.size_bytes / 1024).toFixed(1)} KB</td>
                    <td className="text-xs text-textMuted">{new Date(f.created_at).toLocaleString()}</td>
                    <td className="text-right">
                      <button 
                        onClick={() => handleRestore(f.id, f.original_path)}
                        disabled={restoringId === f.id}
                        className="inline-flex items-center gap-2 bg-white border border-border hover:bg-[#f8f9fa] text-textMain text-xs font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                      >
                        {restoringId === f.id ? (
                          <History className="w-3.5 h-3.5 animate-spin text-primary" />
                        ) : (
                          <DownloadCloud className="w-3.5 h-3.5 text-primary" />
                        )}
                        {restoringId === f.id ? 'Decrypting...' : 'Restore'}
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
