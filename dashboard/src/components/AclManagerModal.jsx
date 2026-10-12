import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import {
  Lock,
  Unlock,
  Key,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Terminal,
  History,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return isNaN(d) ? ts : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
}

export function AclManagerModal({ isOpen, onClose, asset, onRefresh }) {
  const [activeTab, setActiveTab] = useState('acl'); // 'acl' | 'password' | 'audit'
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);
  const [showRawAcl, setShowRawAcl] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Unlock state
  const [unlockPassword, setUnlockPassword] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  // Password management state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Audit state
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const fetchStatus = useCallback(() => {
    if (!asset?.file_path) return;
    setLoading(true);
    setActionError('');
    api.get(`/access/status?path=${encodeURIComponent(asset.file_path)}`)
      .then(res => setStatusData(res.data))
      .catch(err => setActionError(err.response?.data?.detail || 'Failed to fetch ACL status'))
      .finally(() => setLoading(false));
  }, [asset]);

  const fetchAudit = useCallback(() => {
    if (!asset?.file_path) return;
    setLoadingAudit(true);
    api.get(`/access/audit?limit=25&path=${encodeURIComponent(asset.file_path)}`)
      .then(res => setAuditLogs(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoadingAudit(false));
  }, [asset]);

  useEffect(() => {
    if (isOpen && asset) {
      fetchStatus();
      fetchAudit();
      setActiveTab('acl');
      setUnlockPassword('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActionError('');
      setActionSuccess('');
    }
  }, [isOpen, asset, fetchStatus, fetchAudit]);

  if (!isOpen || !asset) return null;

  const handleLock = async () => {
    setIsLocking(true);
    setActionError('');
    setActionSuccess('');
    try {
      await api.post('/access/lock', { path: asset.file_path });
      setActionSuccess('Path locked with NTFS DENY Write ACL.');
      fetchStatus();
      fetchAudit();
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to lock path.');
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlock = async () => {
    setIsUnlocking(true);
    setActionError('');
    setActionSuccess('');
    try {
      await api.post('/access/unlock', {
        path: asset.file_path,
        password: unlockPassword || undefined,
      });
      setActionSuccess('Path unlocked successfully. Normal write access restored.');
      setUnlockPassword('');
      fetchStatus();
      fetchAudit();
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to unlock path. Verify password.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    if (newPassword && newPassword !== confirmPassword) {
      setActionError('New passwords do not match.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await api.post('/access/set-password', {
        path: asset.file_path,
        new_password: newPassword,
        current_password: currentPassword || undefined,
      });
      setActionSuccess(res.data.message || 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchStatus();
      fetchAudit();
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to update password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!window.confirm('Remove password protection from this path?')) return;
    setIsSavingPassword(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await api.post('/access/set-password', {
        path: asset.file_path,
        new_password: '',
        current_password: currentPassword || undefined,
      });
      setActionSuccess('Password protection removed.');
      setCurrentPassword('');
      fetchStatus();
      fetchAudit();
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to remove password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const isLocked = statusData?.is_locked ?? asset.is_locked;
  const hasPassword = statusData?.has_password ?? asset.has_password;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-borderHighlight rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-borderHighlight flex items-start justify-between bg-surfaceHighlight/50">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${isLocked ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-textMain tracking-tight">Access Control & Security</h3>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                  asset.tier === 'critical' ? 'bg-critical/10 text-critical border-critical/30' :
                  asset.tier === 'informational' ? 'bg-primary/10 text-primary border-primary/30' :
                  'bg-surfaceHighlight text-textMuted border-borderHighlight'
                }`}>
                  {asset.tier}
                </span>
              </div>
              <p className="text-xs font-mono text-textMuted mt-1 break-all">{asset.file_path}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-textMuted hover:text-textMain rounded-lg hover:bg-surfaceHighlight transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-borderHighlight bg-surface px-6 pt-2 gap-4">
          <button
            onClick={() => { setActiveTab('acl'); setActionError(''); setActionSuccess(''); }}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'acl'
                ? 'border-primary text-primary'
                : 'border-transparent text-textMuted hover:text-textMain'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Permissions & Lock
          </button>
          <button
            onClick={() => { setActiveTab('password'); setActionError(''); setActionSuccess(''); }}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'password'
                ? 'border-primary text-primary'
                : 'border-transparent text-textMuted hover:text-textMain'
            }`}
          >
            <Key className="w-4 h-4" />
            Unlock Password {hasPassword && <span className="w-1.5 h-1.5 rounded-full bg-success"></span>}
          </button>
          <button
            onClick={() => { setActiveTab('audit'); setActionError(''); setActionSuccess(''); fetchAudit(); }}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'audit'
                ? 'border-primary text-primary'
                : 'border-transparent text-textMuted hover:text-textMain'
            }`}
          >
            <History className="w-4 h-4" />
            Audit Trail
          </button>
        </div>

        {/* Notifications */}
        {actionError && (
          <div className="mx-6 mt-4 p-3 bg-critical/10 border border-critical/30 rounded-lg flex items-center gap-3 text-xs text-critical font-medium animate-fade-in">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="mx-6 mt-4 p-3 bg-success/10 border border-success/30 rounded-lg flex items-center gap-3 text-xs text-success font-medium animate-fade-in">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-textMuted">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs font-mono">Querying Windows NTFS ACL...</span>
            </div>
          ) : activeTab === 'acl' ? (
            <div className="flex flex-col gap-6">
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-4 ${
                isLocked
                  ? 'bg-success/5 border-success/30 text-success'
                  : 'bg-surfaceHighlight border-borderHighlight text-textMuted'
              }`}>
                <div className={`p-2.5 rounded-lg ${isLocked ? 'bg-success/10 text-success' : 'bg-surface text-textMuted'}`}>
                  {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-textMain tracking-wide uppercase">
                    {isLocked ? 'NTFS DENY Write Active (Secured)' : 'Standard Write Access (Unlocked)'}
                  </h4>
                  <p className="text-xs text-textMuted mt-1 leading-relaxed">
                    {isLocked
                      ? 'Tamper-proofing is enforced. All write, append, rename, and encrypt operations are blocked by Windows NTFS ACL for all users and ransomware.'
                      : 'File modifications are allowed. Baseline monitoring is active, but write operations are not blocked.'}
                  </p>
                </div>
              </div>

              {/* Action Section */}
              <div className="p-5 border border-borderHighlight rounded-xl bg-surfaceHighlight/30 flex flex-col gap-4">
                <h5 className="text-xs font-bold text-textMain uppercase tracking-widest">
                  Quick Security Action
                </h5>

                {isLocked ? (
                  <div className="flex flex-col gap-3">
                    {hasPassword && (
                      <div>
                        <label className="block text-[11px] font-bold text-textMuted uppercase tracking-wider mb-1.5">
                          Folder Unlock Password
                        </label>
                        <input
                          type="password"
                          value={unlockPassword}
                          onChange={(e) => setUnlockPassword(e.target.value)}
                          placeholder="Enter authorization password to unlock"
                          className="w-full bg-surface border border-borderHighlight rounded-lg px-4 py-2.5 text-xs text-textMain font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                    )}
                    <button
                      onClick={handleUnlock}
                      disabled={isUnlocking || (hasPassword && !unlockPassword)}
                      className="flex items-center justify-center gap-2 bg-critical/10 hover:bg-critical hover:text-white border border-critical/30 text-critical text-xs font-bold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 uppercase tracking-widest shadow-sm"
                    >
                      <Unlock className={`w-4 h-4 ${isUnlocking ? 'animate-spin' : ''}`} />
                      {isUnlocking ? 'REMOVING ACL...' : 'UNLOCK FOLDER (RESTORE WRITE ACCESS)'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-textMuted mb-3">
                      Lock this asset to immediately deny write permissions to the Everyone group.
                    </p>
                    <button
                      onClick={handleLock}
                      disabled={isLocking}
                      className="w-full flex items-center justify-center gap-2 bg-success hover:bg-success/90 text-white text-xs font-bold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 uppercase tracking-widest shadow-sm"
                    >
                      <Lock className={`w-4 h-4 ${isLocking ? 'animate-spin' : ''}`} />
                      {isLocking ? 'APPLYING DENY ACL...' : 'ENFORCE DENY WRITE ACL (LOCK)'}
                    </button>
                  </div>
                )}
              </div>

              {/* Windows icacls Inspector */}
              <div className="border border-borderHighlight rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowRawAcl(!showRawAcl)}
                  className="w-full px-4 py-3 bg-surfaceHighlight/50 hover:bg-surfaceHighlight flex items-center justify-between text-xs font-bold text-textMain uppercase tracking-wider transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    Inspect Live Windows icacls DACL
                  </span>
                  <span className="text-[10px] text-primary underline">
                    {showRawAcl ? 'HIDE DETAILS' : 'VIEW DETAILS'}
                  </span>
                </button>
                {showRawAcl && (
                  <div className="p-4 bg-background font-mono text-[11px] text-textMuted border-t border-borderHighlight overflow-x-auto whitespace-pre-wrap max-h-48">
                    {statusData?.ntfs_acl?.raw_output || 'No output recorded'}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'password' ? (
            <form onSubmit={handleSavePassword} className="flex flex-col gap-5">
              <div className="p-4 bg-surfaceHighlight/40 border border-borderHighlight rounded-xl flex items-start gap-3">
                <Key className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-xs text-textMuted leading-relaxed">
                  <p className="font-bold text-textMain mb-1">
                    {hasPassword ? 'Password Protection Active' : 'No Dedicated Password Set'}
                  </p>
                  Setting an unlock password requires entering this passphrase before removing the NTFS DENY ACL from the admin dashboard.
                </div>
              </div>

              {hasPassword && (
                <div>
                  <label className="block text-[11px] font-bold text-textMuted uppercase tracking-wider mb-1.5">
                    Current Password <span className="text-critical">*</span>
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current folder unlock password"
                    className="w-full bg-surface border border-borderHighlight rounded-lg px-4 py-2.5 text-xs text-textMain font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-textMuted uppercase tracking-wider mb-1.5">
                  {hasPassword ? 'New Password' : 'Set Unlock Password'}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter secure password or PIN"
                    className="w-full bg-surface border border-borderHighlight rounded-lg px-4 py-2.5 text-xs text-textMain font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-textMuted hover:text-textMain"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-textMuted uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter password"
                  className="w-full bg-surface border border-borderHighlight rounded-lg px-4 py-2.5 text-xs text-textMain font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {hasPassword ? (
                  <button
                    type="button"
                    onClick={handleRemovePassword}
                    disabled={isSavingPassword || !currentPassword}
                    className="text-xs font-bold text-critical hover:underline uppercase tracking-wider disabled:opacity-40"
                  >
                    Remove Password
                  </button>
                ) : <div />}

                <button
                  type="submit"
                  disabled={isSavingPassword || !newPassword || !confirmPassword}
                  className="bg-primary hover:bg-primary/90 text-white text-xs font-bold py-2.5 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 uppercase tracking-widest shadow-sm"
                >
                  {isSavingPassword ? 'SAVING...' : 'SAVE PASSWORD'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-textMuted uppercase tracking-widest">
                  Recent ACL Events ({auditLogs.length})
                </span>
                <button
                  onClick={fetchAudit}
                  disabled={loadingAudit}
                  className="text-xs font-bold text-primary flex items-center gap-1.5 hover:underline"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
                  REFRESH
                </button>
              </div>

              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-textMuted text-xs font-mono">
                  No access audit logs recorded for this path yet.
                </div>
              ) : (
                <div className="border border-borderHighlight rounded-xl overflow-hidden bg-surface">
                  <table className="enterprise-table text-xs">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Action</th>
                        <th>Actor</th>
                        <th>Outcome</th>
                        <th>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log, i) => (
                        <tr key={i} className="hover:bg-surfaceHighlight/30 transition-colors">
                          <td className="font-mono text-[11px] text-textMuted">{fmtDate(log.performed_at)}</td>
                          <td className="font-bold text-[11px] text-textMain">{log.action}</td>
                          <td className="font-mono text-[11px] text-primary">{log.actor || 'admin'}</td>
                          <td>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              log.outcome === 'SUCCESS' ? 'bg-success/10 text-success border-success/30' :
                              'bg-critical/10 text-critical border-critical/30'
                            }`}>
                              {log.outcome}
                            </span>
                          </td>
                          <td className="font-mono text-[11px] text-textMuted">{log.ip_address || '127.0.0.1'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-borderHighlight bg-surfaceHighlight/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-textMuted hover:text-textMain rounded-lg transition-colors uppercase tracking-wider"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
