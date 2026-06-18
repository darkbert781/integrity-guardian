import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

/* ─── tiny icon helpers (inline SVG, no external dep) ─────────────────────── */
const Icon = ({ d, size = 16, color = 'currentColor', className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
       className={className}>
    <path d={d} />
  </svg>
);

const ICONS = {
  lock:    'M12 17v-2m0 0a4 4 0 100-8 4 4 0 000 8zm0 0v2m-6 4h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  restore: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  copy:    'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  check:   'M5 13l4 4L19 7',
  shield:  'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  warn:    'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  x:       'M6 18L18 6M6 6l12 12',
  clock:   'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  file:    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
};

/* ─── hash truncation helper ───────────────────────────────────────────────── */
function truncateHash(h) {
  if (!h) return '—';
  return h.length > 16 ? `${h.slice(0, 8)}…${h.slice(-8)}` : h;
}

/* ─── format timestamp nicely ──────────────────────────────────────────────── */
function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return isNaN(d) ? ts : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/* ─── copy to clipboard ────────────────────────────────────────────────────── */
function CopyHash({ hash }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(hash || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={handleCopy} title="Copy full hash" style={styles.copyBtn}>
      <Icon d={copied ? ICONS.check : ICONS.copy} size={13}
            color={copied ? '#4ade80' : '#64748b'} />
      <span style={{ fontFamily: 'monospace', fontSize: 12, color: copied ? '#4ade80' : '#94a3b8' }}>
        {truncateHash(hash)}
      </span>
    </button>
  );
}

/* ─── confirmation modal ───────────────────────────────────────────────────── */
function ConfirmModal({ entry, onConfirm, onCancel, restoring }) {
  if (!entry) return null;
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <Icon d={ICONS.warn} size={24} color="#f59e0b" />
          <span style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9' }}>Confirm File Restore</span>
          <button onClick={onCancel} style={styles.closeBtn} disabled={restoring}>
            <Icon d={ICONS.x} size={18} color="#64748b" />
          </button>
        </div>
        <p style={{ color: '#94a3b8', margin: '12px 0 6px', fontSize: 13, lineHeight: 1.6 }}>
          This will <strong style={{ color: '#f59e0b' }}>overwrite</strong> the current version of:
        </p>
        <div style={styles.pathBox}>{entry.file_path}</div>
        <p style={{ color: '#64748b', fontSize: 12, margin: '8px 0 20px', lineHeight: 1.6 }}>
          Vaulted: <span style={{ color: '#94a3b8' }}>{fmtDate(entry.timestamp)}</span>
          &nbsp;·&nbsp;Hash: <span style={{ fontFamily: 'monospace' }}>{truncateHash(entry.file_hash)}</span>
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={styles.cancelBtn} disabled={restoring}>Cancel</button>
          <button onClick={onConfirm} style={styles.confirmBtn} disabled={restoring}>
            {restoring ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={styles.spinner} />Restoring…
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon d={ICONS.restore} size={14} /> Restore File
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── toast notification ───────────────────────────────────────────────────── */
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = type === 'success' ? 'rgba(22,101,52,0.95)' : 'rgba(127,29,29,0.95)';
  const border = type === 'success' ? '#16a34a' : '#dc2626';
  const icon = type === 'success' ? ICONS.check : ICONS.x;
  const iconColor = type === 'success' ? '#4ade80' : '#f87171';

  return (
    <div style={{ ...styles.toast, background: bg, borderLeft: `3px solid ${border}` }}>
      <Icon d={icon} size={16} color={iconColor} />
      <span style={{ fontSize: 13, color: '#f1f5f9', flex: 1 }}>{message}</span>
      <button onClick={onClose} style={styles.closeBtn}>
        <Icon d={ICONS.x} size={14} color="#64748b" />
      </button>
    </div>
  );
}

/* ─── main Vault component ─────────────────────────────────────────────────── */
export function Vault() {
  const [vaultFiles, setVaultFiles] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [pending, setPending]       = useState(null);   // entry awaiting confirmation
  const [restoring, setRestoring]   = useState(false);
  const [restoredIds, setRestoredIds] = useState(new Set());
  const [toast, setToast]           = useState(null);
  const [search, setSearch]         = useState('');

  const fetchVault = useCallback(() => {
    setError(null);
    api.get('/rollback/vault')
      .then(res => setVaultFiles(res.data.vault_entries || []))
      .catch(() => setError('Unable to load vault entries. Is the API running?'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchVault(); }, [fetchVault]);

  const handleRestore = () => {
    if (!pending) return;
    setRestoring(true);
    api.post(`/rollback/${pending.id}`)
      .then(() => {
        setRestoredIds(prev => new Set(prev).add(pending.id));
        setToast({ message: `✓ Restored: ${pending.file_path}`, type: 'success' });
        fetchVault();
      })
      .catch(err => {
        setToast({ message: `✗ Rollback failed: ${err.response?.data?.detail || err.message}`, type: 'error' });
      })
      .finally(() => { setRestoring(false); setPending(null); });
  };

  const filtered = vaultFiles.filter(v =>
    !search || v.file_path?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.page}>
      {/* ── Toast ── */}
      {toast && (
        <Toast message={toast.message} type={toast.type}
               onClose={() => setToast(null)} />
      )}

      {/* ── Confirm modal ── */}
      <ConfirmModal entry={pending} onConfirm={handleRestore}
                    onCancel={() => setPending(null)} restoring={restoring} />

      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconWrap}>
            <Icon d={ICONS.shield} size={22} color="#1E6FBF" />
          </div>
          <div>
            <h2 style={styles.title}>Encrypted File Vault</h2>
            <p style={styles.subtitle}>AES-256 secured snapshots · Restore any known-good version</p>
          </div>
        </div>
        <div style={styles.stats}>
          <div style={styles.statChip}>
            <Icon d={ICONS.file} size={14} color="#1E6FBF" />
            <span style={{ color: '#cbd5e1', fontSize: 13 }}>{vaultFiles.length} snapshot{vaultFiles.length !== 1 ? 's' : ''}</span>
          </div>
          <button onClick={fetchVault} style={styles.refreshBtn} title="Refresh">
            <Icon d={ICONS.restore} size={15} color="#94a3b8" />
          </button>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div style={styles.searchWrap}>
        <Icon d={ICONS.file} size={15} color="#475569" />
        <input
          style={styles.searchInput}
          placeholder="Filter by file path…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Icon d={ICONS.x} size={13} color="#64748b" />
          </button>
        )}
      </div>

      {/* ── Content area ── */}
      <div style={styles.tableWrap}>
        {loading ? (
          <div style={styles.emptyState}>
            <div style={styles.loadingDots}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ ...styles.dot, animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <p style={{ color: '#475569', marginTop: 16 }}>Loading vault…</p>
          </div>
        ) : error ? (
          <div style={styles.emptyState}>
            <Icon d={ICONS.warn} size={36} color="#f59e0b" />
            <p style={{ color: '#f59e0b', margin: '12px 0 4px', fontWeight: 600 }}>{error}</p>
            <button onClick={fetchVault} style={styles.retryBtn}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <Icon d={ICONS.lock} size={40} color="#1e3a5f" />
            <p style={{ color: '#334155', margin: '14px 0 4px', fontWeight: 600 }}>
              {search ? 'No matching vault entries' : 'Vault is empty'}
            </p>
            <p style={{ color: '#475569', fontSize: 13 }}>
              {search ? 'Clear the filter to see all entries.' : 'Files will appear here once monitored & vaulted.'}
            </p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {['Timestamp', 'Original File Path', 'Vaulted Hash (SHA-256)', 'Status', 'Action'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, idx) => {
                const wasRestored = restoredIds.has(v.id);
                return (
                  <tr key={v.id}
                      style={{ ...styles.tr, animationDelay: `${idx * 40}ms` }}
                      className="vault-row">
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon d={ICONS.clock} size={13} color="#475569" />
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{fmtDate(v.timestamp)}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.filePath}>{v.file_path}</span>
                    </td>
                    <td style={styles.td}>
                      <CopyHash hash={v.file_hash} />
                    </td>
                    <td style={styles.td}>
                      {wasRestored ? (
                        <span style={styles.badgeRestored}>
                          <Icon d={ICONS.check} size={11} color="#4ade80" /> Restored
                        </span>
                      ) : (
                        <span style={styles.badgeVaulted}>
                          <Icon d={ICONS.shield} size={11} color="#1E6FBF" /> Vaulted
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <button
                        id={`restore-btn-${v.id}`}
                        onClick={() => setPending(v)}
                        style={wasRestored ? styles.restoreBtnDim : styles.restoreBtn}
                        title={wasRestored ? 'Already restored this session' : 'Restore this version'}
                      >
                        <Icon d={ICONS.restore} size={13} />
                        {wasRestored ? 'Re-restore' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
        .vault-row {
          animation: fadeSlideIn 0.3s ease-out both;
        }
        .vault-row:hover td { background: rgba(30,111,191,0.06) !important; }
      `}</style>
    </div>
  );
}

/* ─── styles ───────────────────────────────────────────────────────────────── */
const styles = {
  page: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    height: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(30,111,191,0.12)',
    border: '1px solid rgba(30,111,191,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: '#f1f5f9',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    margin: 0,
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  statChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(30,111,191,0.1)',
    border: '1px solid rgba(30,111,191,0.2)',
    borderRadius: 20,
    padding: '4px 12px',
  },
  refreshBtn: {
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(51,65,85,0.6)',
    borderRadius: 8,
    padding: '6px 10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'border-color 0.2s',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(51,65,85,0.5)',
    borderRadius: 10,
    padding: '8px 14px',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: '#cbd5e1',
    fontSize: 13,
    fontFamily: 'inherit',
  },
  tableWrap: {
    flex: 1,
    background: 'rgba(15,23,42,0.5)',
    border: '1px solid rgba(30,111,191,0.15)',
    borderRadius: 14,
    overflow: 'auto',
    backdropFilter: 'blur(8px)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  th: {
    padding: '12px 14px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid rgba(30,111,191,0.12)',
    background: 'rgba(15,23,42,0.6)',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  tr: {
    transition: 'background 0.15s',
  },
  td: {
    padding: '11px 14px',
    borderBottom: '1px solid rgba(30,41,59,0.7)',
    verticalAlign: 'middle',
    transition: 'background 0.15s',
  },
  filePath: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#94a3b8',
    wordBreak: 'break-all',
  },
  copyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(30,41,59,0.5)',
    border: '1px solid rgba(51,65,85,0.4)',
    borderRadius: 6,
    padding: '3px 8px',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  badgeVaulted: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(30,111,191,0.12)',
    color: '#60a5fa',
    border: '1px solid rgba(30,111,191,0.25)',
    borderRadius: 20,
    padding: '2px 9px',
    fontSize: 11,
    fontWeight: 600,
  },
  badgeRestored: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(22,101,52,0.15)',
    color: '#4ade80',
    border: '1px solid rgba(22,101,52,0.3)',
    borderRadius: 20,
    padding: '2px 9px',
    fontSize: 11,
    fontWeight: 600,
  },
  restoreBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: 'linear-gradient(135deg, rgba(192,57,43,0.8), rgba(152,27,13,0.9))',
    border: '1px solid rgba(192,57,43,0.4)',
    color: '#fecdd3',
    borderRadius: 8,
    padding: '5px 12px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    transition: 'opacity 0.15s, transform 0.1s',
  },
  restoreBtnDim: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(30,41,59,0.5)',
    border: '1px solid rgba(51,65,85,0.35)',
    color: '#64748b',
    borderRadius: 8,
    padding: '5px 12px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 40px',
    gap: 4,
  },
  loadingDots: {
    display: 'flex',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#1E6FBF',
    animation: 'dotPulse 1.2s infinite ease-in-out',
  },
  retryBtn: {
    marginTop: 12,
    background: 'rgba(30,111,191,0.15)',
    border: '1px solid rgba(30,111,191,0.35)',
    color: '#60a5fa',
    borderRadius: 8,
    padding: '6px 18px',
    cursor: 'pointer',
    fontSize: 13,
  },
  /* ── modal ── */
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2,6,23,0.75)',
    backdropFilter: 'blur(6px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    background: 'rgba(15,23,42,0.97)',
    border: '1px solid rgba(30,111,191,0.25)',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  pathBox: {
    background: 'rgba(30,41,59,0.6)',
    border: '1px solid rgba(51,65,85,0.5)',
    borderRadius: 8,
    padding: '8px 12px',
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#e2e8f0',
    wordBreak: 'break-all',
  },
  closeBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
  },
  cancelBtn: {
    background: 'rgba(30,41,59,0.6)',
    border: '1px solid rgba(51,65,85,0.5)',
    color: '#94a3b8',
    borderRadius: 8,
    padding: '8px 18px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  confirmBtn: {
    background: 'linear-gradient(135deg, #c0392b, #962d22)',
    border: '1px solid rgba(192,57,43,0.4)',
    color: '#fecdd3',
    borderRadius: 8,
    padding: '8px 18px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 130,
    justifyContent: 'center',
  },
  spinner: {
    width: 13,
    height: 13,
    border: '2px solid rgba(255,255,255,0.2)',
    borderTopColor: '#fecdd3',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  },
  /* ── toast ── */
  toast: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 10,
    boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
    maxWidth: 400,
    animation: 'fadeSlideIn 0.25s ease-out',
  },
};
