import React, { useEffect, useState } from 'react';
import api from '../lib/api';

/* ── icons ─────────────────────────────────────────────────────────────────── */
const Icon = ({ d, size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  save:     'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4',
  check:    'M5 13l4 4L19 7',
};

function Section({ title, children, className }) {
  return (
    <div className={className} style={{
      background: 'rgba(15,23,42,0.5)',
      border: '1px solid rgba(30,111,191,0.1)',
      borderRadius: 14,
      padding: '24px',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h3 style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 700, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</h3>
      <div style={{ flex: 1 }}>
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

  const Field = ({ label, field, type = 'text', hint }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={config[field] ?? ''}
        onChange={e => setConfig(prev => ({ ...prev, [field]: e.target.value }))}
        style={{
          width: '100%',
          background: 'rgba(2,6,23,0.5)',
          border: '1px solid rgba(51,65,85,0.6)',
          borderRadius: 8,
          padding: '10px 14px',
          color: '#f1f5f9',
          fontSize: 13,
          outline: 'none',
          transition: 'border-color 0.2s',
          fontFamily: type === 'number' || field.includes('path') || field.includes('dir') || field.includes('url') ? 'monospace' : 'inherit'
        }}
        onFocus={e => e.target.style.borderColor = 'rgba(30,111,191,0.6)'}
        onBlur={e => e.target.style.borderColor = 'rgba(51,65,85,0.6)'}
      />
      {hint && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>{hint}</p>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'rgba(30,111,191,0.12)', border:'1px solid rgba(30,111,191,0.22)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon d={ICONS.settings} size={20} color="#1E6FBF" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>System Configuration</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Manage Integrity Guardian operational parameters</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#4ade80', animation: 'fadeIn 0.3s' }}>
              <Icon d={ICONS.check} size={14} /> Saved successfully
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              background: 'linear-gradient(135deg, #1E6FBF, #1557a0)',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: (saving || loading) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: (saving || loading) ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            <Icon d={ICONS.save} size={16} />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', gap: 8 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#1E6FBF', animation: 'pulse 1.2s infinite ease-in-out', animationDelay: `${i*0.2}s` }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, '@media (min-width: 768px)': { gridTemplateColumns: '1fr 1fr' } }} className="md:grid-cols-2">
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* General */}
            <Section title="General Environment">
              <Field label="Database Path" field="db_path" hint="Absolute path to the encrypted SQLCipher database" />
              <Field label="Vault Directory" field="vault_dir" hint="Storage location for AES-256 encrypted file snapshots" />
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Log Level</label>
                <select
                  value={config.log_level ?? 'INFO'}
                  onChange={e => setConfig(prev => ({ ...prev, log_level: e.target.value }))}
                  style={{
                    width: '100%',
                    background: 'rgba(2,6,23,0.5)',
                    border: '1px solid rgba(51,65,85,0.6)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: '#f1f5f9',
                    fontSize: 13,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="DEBUG">DEBUG - Verbose output</option>
                  <option value="INFO">INFO - Standard operation</option>
                  <option value="WARNING">WARNING - Issues only</option>
                  <option value="ERROR">ERROR - Critical failures</option>
                </select>
              </div>
            </Section>

            {/* Monitoring */}
            <Section title="Monitoring Tuning">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Scan Interval (s)" field="scan_interval" type="number" hint="Seconds between background baseline verification sweeps" />
                <Field label="Max Vault Size (MB)" field="max_vault_size" type="number" hint="Threshold before rotating oldest encrypted snapshots" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="AI Anomaly Threshold" field="ai_threshold" type="number" hint="Isolation Forest score cutoff (-1.0 to 1.0)" />
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Hash Algorithm</label>
                  <select
                    value={config.hash_algorithm ?? 'BLAKE3'}
                    onChange={e => setConfig(prev => ({ ...prev, hash_algorithm: e.target.value }))}
                    style={{
                      width: '100%',
                      background: 'rgba(2,6,23,0.5)',
                      border: '1px solid rgba(51,65,85,0.6)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      color: '#f1f5f9',
                      fontSize: 13,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="SHA256">SHA-256 (NIST Standard)</option>
                    <option value="BLAKE3">BLAKE3 (High Performance)</option>
                  </select>
                </div>
              </div>
            </Section>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Alert Channels */}
            <Section title="Alert Channels & Webhooks">
              <Field label="SMTP Host" field="smtp_host" hint="Mail server for sending critical event digests" />
              <Field label="Alert Email" field="alert_email" hint="Recipient address for security notifications" />
              <Field label="Slack Webhook URL" field="slack_webhook" hint="Endpoint for posting real-time Slack alerts" />
              <Field label="Microsoft Teams Webhook URL" field="teams_webhook" hint="Endpoint for posting real-time Teams alerts" />
            </Section>
            
            <Section title="System Information">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(51,65,85,0.4)', paddingBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>API Version</span>
                  <span style={{ fontSize: 12, color: '#f1f5f9', fontFamily: 'monospace' }}>2.0.0</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(51,65,85,0.4)', paddingBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Driver Altitude</span>
                  <span style={{ fontSize: 12, color: '#f1f5f9', fontFamily: 'monospace' }}>320000 (FSFilter Anti-Virus)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>UI Status</span>
                  <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>Connected</span>
                </div>
              </div>
            </Section>
          </div>
          
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { transform: scale(0.5); opacity: 0.4; } 50% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
