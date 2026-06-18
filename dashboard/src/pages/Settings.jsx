import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Settings as SettingsIcon, Save, CheckCircle, Send } from 'lucide-react';

function Section({ title, children }) {
  return (
    <div className="enterprise-card p-6 flex flex-col">
      <h3 className="text-sm font-bold text-textMain mb-5 uppercase tracking-wider">{title}</h3>
      <div className="flex-1">
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

  const Field = ({ label, field, type = 'text', hint, placeholder }) => (
    <div className="mb-5">
      <label className="block text-xs font-bold text-textMain uppercase tracking-wider mb-2">{label}</label>
      <input
        type={type}
        value={config[field] ?? ''}
        placeholder={placeholder}
        onChange={e => setConfig(prev => ({ ...prev, [field]: e.target.value }))}
        className="w-full bg-[#f8f9fa] border border-border rounded px-4 py-2.5 text-sm text-textMain outline-none focus:border-primary transition-colors font-mono"
      />
      {hint && <p className="mt-1.5 text-xs text-textMuted">{hint}</p>}
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-textMain tracking-tight">System Configuration</h2>
          <p className="text-sm text-textMuted mt-1">Manage Integrity Guardian operational parameters</p>
        </div>
        <div className="flex items-center gap-4">
          {saved && (
            <span className="flex items-center gap-2 text-sm font-semibold text-success">
              <CheckCircle className="w-4 h-4" /> Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-primary hover:bg-[#0042a3] text-white text-sm font-semibold px-6 py-2.5 rounded transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <SettingsIcon className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
          <div className="flex flex-col gap-6">
            <Section title="General Environment">
              <Field label="Database Path" field="db_path" hint="Absolute path to the encrypted SQLCipher database" placeholder="C:\ProgramData\IntegrityGuardian\integrity.db" />
              <Field label="Vault Directory" field="vault_dir" hint="Storage location for AES-256 encrypted file snapshots. Default: vault/ inside your project folder." placeholder="C:\ProgramData\IntegrityGuardian\Vault" />
              <div className="mb-5">
                <label className="block text-xs font-bold text-textMain uppercase tracking-wider mb-2">Log Level</label>
                <select
                  value={config.log_level ?? 'INFO'}
                  onChange={e => setConfig(prev => ({ ...prev, log_level: e.target.value }))}
                  className="w-full bg-[#f8f9fa] border border-border rounded px-4 py-2.5 text-sm text-textMain outline-none focus:border-primary transition-colors"
                >
                  <option value="DEBUG">DEBUG - Verbose output</option>
                  <option value="INFO">INFO - Standard operation</option>
                  <option value="WARNING">WARNING - Issues only</option>
                  <option value="ERROR">ERROR - Critical failures</option>
                </select>
              </div>
            </Section>

            <Section title="AI & Query Engine">
              <Field
                label="Gemini API Key"
                field="gemini_api_key"
                type="password"
                hint="Get a free key at: aistudio.google.com — Set this as GEMINI_API_KEY environment variable and restart the backend."
                placeholder="AIza..."
              />
              <div className="enterprise-card p-4 bg-[#eff6ff] border-[#93c5fd]">
                <p className="text-xs font-bold text-[#1e40af] mb-1">How to activate Gemini AI</p>
                <ol className="text-xs text-[#1e40af] list-decimal list-inside space-y-1">
                  <li>Go to <span className="font-mono">aistudio.google.com</span> and create a free API key</li>
                  <li>Open a new terminal in your project root</li>
                  <li>Run: <span className="font-mono bg-white px-1 py-0.5 rounded">set GEMINI_API_KEY=your_key_here</span></li>
                  <li>Restart the backend: <span className="font-mono bg-white px-1 py-0.5 rounded">python run_api.py</span></li>
                </ol>
              </div>
            </Section>
          </div>

          <div className="flex flex-col gap-6">
            <Section title="Resend Email Alerts">
              <div className="enterprise-card p-4 bg-[#fffbeb] border-[#fbbf24] mb-5">
                <p className="text-xs font-bold text-[#92400e] mb-1">Setup Instructions</p>
                <ol className="text-xs text-[#92400e] list-decimal list-inside space-y-1">
                  <li>Create a free account at <span className="font-mono">resend.com</span></li>
                  <li>Go to <span className="font-mono">API Keys</span> and create a new key</li>
                  <li>Add and verify your sender domain (or use Resend's shared domain for testing)</li>
                  <li>Set the environment variables below and restart the backend</li>
                </ol>
              </div>
              <Field
                label="Resend API Key"
                field="resend_api_key"
                type="password"
                hint="Set as RESEND_API_KEY environment variable. Get from resend.com/api-keys"
                placeholder="re_..."
              />
              <Field
                label="Sender Email (From)"
                field="resend_from_email"
                hint="Must be from a verified domain on Resend. Set as RESEND_FROM_EMAIL."
                placeholder="alerts@yourdomain.com"
              />
              <Field
                label="Alert Recipient (To)"
                field="resend_to_email"
                hint="Email address that will receive all security alerts. Set as RESEND_TO_EMAIL."
                placeholder="admin@yourorganization.com"
              />

              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="flex items-center gap-2 bg-white border border-border hover:bg-[#f8f9fa] text-textMain text-sm font-semibold px-4 py-2 rounded transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4 text-primary" />
                  {testingEmail ? 'Sending...' : 'Send Test Email'}
                </button>
                {emailTestResult && (
                  <span className={`text-sm font-semibold ${emailTestResult.success ? 'text-success' : 'text-critical'}`}>
                    {emailTestResult.success ? 'Test email sent!' : `Failed: ${emailTestResult.error}`}
                  </span>
                )}
              </div>
            </Section>

            <Section title="System Information">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-sm font-semibold text-textMuted">API Version</span>
                  <span className="text-sm font-mono text-textMain">2.0.0</span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-sm font-semibold text-textMuted">Driver Altitude</span>
                  <span className="text-sm font-mono text-textMain">320000</span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-sm font-semibold text-textMuted">Vault Location</span>
                  <span className="text-sm font-mono text-textMain truncate max-w-[200px]" title="vault/">vault/</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-textMuted">UI Status</span>
                  <span className="text-sm font-bold text-success">Connected</span>
                </div>
              </div>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
