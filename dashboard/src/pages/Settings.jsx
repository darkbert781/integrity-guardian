import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Settings as SettingsIcon, Save, CheckCircle, Send } from 'lucide-react';

function Section({ title, children }) {
  return (
    <div className="enterprise-card p-6 flex flex-col bg-surface border border-borderHighlight shadow-sm">
      <h3 className="text-sm font-bold text-textMain uppercase tracking-widest mb-6 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
        {title}
      </h3>
      <div className="flex-1 relative z-10">
        {children}
      </div>
    </div>
  );
}

export function Settings() {
  const [config, setConfig] = useState({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordResult, setPasswordResult] = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    api.get('/settings/').then(r => setConfig(r.data.config)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = () => {
    setSaving(true);
    api.put('/settings/', config).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }).finally(() => setSaving(false));
  };

  const handleTestEmail = () => {
    setTestingEmail(true);
    setEmailTestResult(null);
    api.post('/alerts/test-email')
      .then(r => setEmailTestResult(r.data))
      .catch(e => setEmailTestResult({ success: false, error: e.message }))
      .finally(() => setTestingEmail(false));
  };

  const handlePasswordChange = async () => {
    const username = localStorage.getItem('username') || 'admin';
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordResult({ success: false, error: 'All password fields are required.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordResult({ success: false, error: 'New passwords do not match.' });
      return;
    }
    if (passwordForm.newPassword.length < 12 || !/[A-Z]/.test(passwordForm.newPassword) || !/[a-z]/.test(passwordForm.newPassword) || !/\d/.test(passwordForm.newPassword) || !/[^A-Za-z0-9]/.test(passwordForm.newPassword)) {
      setPasswordResult({ success: false, error: 'Password must be at least 12 characters and include uppercase, lowercase, a number, and a special character.' });
      return;
    }

    setChangingPassword(true);
    setPasswordResult(null);
    try {
      const res = await api.post('/auth/change-password', {
        username,
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
        confirm_password: passwordForm.confirmPassword,
      });
      setPasswordResult({ success: true, message: res.data.message || 'Password updated successfully.' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const detail = err.response?.data?.detail || 'Unable to update password.';
      setPasswordResult({ success: false, error: detail });
    } finally {
      setChangingPassword(false);
    }
  };

  const Field = ({ label, field, type = 'text', hint, placeholder }) => (
    <div className="mb-6">
      <label className="block text-xs font-bold text-textMuted uppercase tracking-widest mb-2">{label}</label>
      <input
        type={type}
        value={config[field] ?? ''}
        placeholder={placeholder}
        onChange={e => setConfig(prev => ({ ...prev, [field]: e.target.value }))}
        className="w-full bg-surface border border-borderHighlight rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-mono placeholder-textMuted/50 shadow-sm"
      />
      {hint && <p className="mt-2 text-[10px] uppercase tracking-wider text-textMuted leading-relaxed">{hint}</p>}
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-8 max-w-6xl mx-auto w-full animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-textMain tracking-tight">System Settings</h2>
          <p className="text-sm text-textMuted mt-2">Manage Integrity Guardian global settings.</p>
        </div>
        <div className="flex items-center gap-4">
          {saved && (
            <span className="flex items-center gap-2 text-sm font-bold text-success uppercase tracking-widest animate-pulse">
              <CheckCircle className="w-4 h-4" /> Config Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm text-sm font-bold px-6 py-2.5 rounded-lg transition-all duration-300 disabled:opacity-50 uppercase tracking-widest"
          >
            <Save className="w-4 h-4" />
            {saving ? 'COMMITTING...' : 'SAVE CONFIG'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20 flex-col gap-4">
          <SettingsIcon className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-mono text-textMuted">Loading configuration...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
          <div className="flex flex-col gap-8">
            <Section title="Environment Architecture">
              <Field label="Database Path" field="db_path" hint="Absolute path to the encrypted SQLCipher database" placeholder="C:\ProgramData\IntegrityGuardian\integrity.db" />
              <Field label="Vault Directory" field="vault_path" hint="Storage location for AES-256 encrypted file snapshots and mirror copies. Changes take effect immediately." placeholder="C:\Users\YourUser\Desktop\IG_Vault" />
              <div className="mb-2">
                <label className="block text-xs font-bold text-textMuted uppercase tracking-widest mb-2">Log Verbosity</label>
                <select
                  value={config.log_level ?? 'INFO'}
                  onChange={e => setConfig(prev => ({ ...prev, log_level: e.target.value }))}
                  className="w-full bg-surface border border-borderHighlight rounded-lg px-4 py-3 text-sm font-bold tracking-wider text-textMain outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
                >
                  <option value="DEBUG">DEBUG - VERBOSE OUTPUT</option>
                  <option value="INFO">INFO - STANDARD OPERATION</option>
                  <option value="WARNING">WARNING - ANOMALIES ONLY</option>
                  <option value="ERROR">ERROR - CRITICAL FAILURES</option>
                </select>
              </div>
            </Section>

            <Section title="AI Intelligence Engine">
              <Field
                label="OpenAI API Key"
                field="openai_api_key"
                type="password"
                hint="Get a key at: platform.openai.com/api-keys — Set this as OPENAI_API_KEY environment variable and restart the backend."
                placeholder="sk-..."
              />
              <div className="enterprise-card p-5 bg-primary/5 border border-primary/30 shadow-inner">
                <p className="text-xs font-bold text-primary tracking-widest uppercase mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  AI Activation Sequence
                </p>
                <ol className="text-xs text-textMuted list-decimal list-inside space-y-2 font-mono">
                  <li>Generate token at <span className="text-primary font-bold">platform.openai.com/api-keys</span></li>
                  <li>Open a new terminal</li>
                  <li>Execute: <span className="bg-background px-2 py-1 rounded border border-borderHighlight text-textMain">set OPENAI_API_KEY=&lt;token&gt;</span></li>
                  <li>Restart service: <span className="bg-background px-2 py-1 rounded border border-borderHighlight text-textMain">python run_api.py</span></li>
                </ol>
              </div>
            </Section>
          </div>

          <div className="flex flex-col gap-8">
            <Section title="Email Alert Configuration">
              <div className="enterprise-card p-5 bg-warning/5 border border-warning/30 shadow-inner mb-6">
                <p className="text-xs font-bold text-warning tracking-widest uppercase mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                  Resend Email Config
                </p>
                <ol className="text-xs text-textMuted list-decimal list-inside space-y-2 font-mono">
                  <li>Provision account at <span className="text-warning font-bold">resend.com</span></li>
                  <li>Generate API Token</li>
                  <li>Verify Sender Domain</li>
                  <li>Define environment variables & Restart</li>
                </ol>
              </div>
              <Field
                label="Resend API Key"
                field="resend_api_key"
                type="password"
                hint="Set as RESEND_API_KEY environment variable."
                placeholder="re_..."
              />
              <Field
                label="Sender Email (From)"
                field="resend_from_email"
                hint="Must be from a verified domain on Resend."
                placeholder="alerts@yourdomain.com"
              />
              <Field
                label="Alert Recipient (To)"
                field="resend_to_email"
                hint="Email address that will receive critical security alerts."
                placeholder="admin@yourorganization.com"
              />

              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="flex items-center gap-2 bg-surface border border-borderHighlight hover:bg-surfaceHighlight hover:border-primary/30 text-textMain text-xs font-bold px-4 py-2.5 rounded-lg transition-all uppercase tracking-widest disabled:opacity-50 shadow-sm"
                >
                  <Send className={`w-4 h-4 ${testingEmail ? 'text-primary animate-pulse' : 'text-textMuted'}`} />
                  {testingEmail ? 'SENDING...' : 'TEST CONNECTION'}
                </button>
                {emailTestResult && (
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${emailTestResult.success ? 'text-success' : 'text-critical'}`}>
                    {emailTestResult.success ? 'TRANSMISSION SUCCESSFUL' : `FAILED: ${emailTestResult.error}`}
                  </span>
                )}
              </div>
            </Section>

            <Section title="SMS Alert Configuration">
              <div className="mb-6">
                <label className="block text-xs font-bold text-textMuted uppercase tracking-widest mb-2">Current SMS Recipient</label>
                <div className="w-full bg-surface border border-borderHighlight rounded-lg px-4 py-3 text-sm text-textMain font-mono shadow-sm">
                  {config.sms_to_phone || config.alert_phone_number || 'Not configured'}
                </div>
              </div>
              <Field
                label="New Phone Number"
                field="sms_to_phone"
                hint="Update the phone number that receives critical security alert SMS messages."
                placeholder="+260..."
              />
            </Section>

            <Section title="Account Security">
              <p className="text-xs text-textMuted mb-4 uppercase tracking-widest font-bold">Change your system login password securely.</p>
              <div className="mb-6">
                <label className="block text-xs font-bold text-textMuted uppercase tracking-widest mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  className="w-full bg-surface border border-borderHighlight rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-mono placeholder-textMuted/50 shadow-sm"
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-bold text-textMuted uppercase tracking-widest mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  className="w-full bg-surface border border-borderHighlight rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-mono placeholder-textMuted/50 shadow-sm"
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-bold text-textMuted uppercase tracking-widest mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Re-enter new password"
                  className="w-full bg-surface border border-borderHighlight rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-mono placeholder-textMuted/50 shadow-sm"
                />
              </div>
              <ul className="text-[10px] uppercase tracking-wider text-textMuted leading-relaxed mb-6 list-disc pl-5">
                <li>Current password must verify before any change.</li>
                <li>Use at least 12 characters with upper/lowercase, number, and symbol.</li>
              </ul>
              <button
                onClick={handlePasswordChange}
                disabled={changingPassword}
                className="flex items-center gap-2 bg-surface border border-borderHighlight hover:bg-surfaceHighlight hover:border-primary/30 text-textMain text-xs font-bold px-4 py-2.5 rounded-lg transition-all uppercase tracking-widest disabled:opacity-50 shadow-sm"
              >
                {changingPassword ? 'UPDATING...' : 'UPDATE PASSWORD'}
              </button>
              {passwordResult && (
                <div className={`mt-4 text-[10px] font-bold uppercase tracking-widest ${passwordResult.success ? 'text-success' : 'text-critical'}`}>
                  {passwordResult.success ? passwordResult.message : passwordResult.error}
                </div>
              )}
            </Section>

            <Section title="System Information">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between border-b border-borderHighlight pb-3">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-widest">API Version</span>
                  <span className="text-xs font-mono text-primary font-bold">2.0.0-PROD</span>
                </div>
                <div className="flex justify-between border-b border-borderHighlight pb-3">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-widest">Driver Altitude</span>
                  <span className="text-xs font-mono text-primary font-bold">320000 (Minifilter)</span>
                </div>
                <div className="flex justify-between border-b border-borderHighlight pb-3">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-widest">Vault Storage</span>
                  <span className="text-xs font-mono text-textMain truncate max-w-[200px]" title="vault/">vault/</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-widest">Interface Link</span>
                  <span className="text-[10px] font-bold text-success uppercase tracking-widest px-2 py-1 bg-success/10 border border-success/30 rounded flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
                    SECURE ACTIVE
                  </span>
                </div>
              </div>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
