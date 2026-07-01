import React, { useState } from 'react';
import api from '../lib/api';
import { Shield } from 'lucide-react';

export function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) return setError("Please fill all fields");
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { username, password });
      onLogin(res.data.access_token);
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background font-sans relative overflow-hidden">
      <div className="absolute top-0 w-full h-[300px] bg-primary/5 border-b border-borderHighlight pointer-events-none"></div>

      <div className="bg-surface p-10 rounded-2xl shadow-xl w-[420px] border border-borderHighlight relative z-10 animate-fade-in-up">
        
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6 bg-surfaceHighlight border border-borderHighlight shadow-sm overflow-hidden relative group">
            <img src="/logo.ico" alt="Integrity Guardian Logo" className="w-full h-full object-contain p-2 relative z-10" />
          </div>
          <h2 className="text-3xl font-extrabold text-textMain tracking-tight">Integrity Guardian</h2>
          <p className="text-xs text-primary font-mono uppercase tracking-widest mt-2">Secure Authentication Terminal</p>
        </div>

        {error && (
          <div className="bg-criticalBg border border-critical/30 text-critical mb-6 p-4 rounded-lg text-sm text-center font-bold">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6">
          <div>
            <label className="block text-xs font-bold text-textMuted uppercase tracking-widest mb-3">Operator ID</label>
            <input 
              className="w-full p-3.5 bg-background text-textMain rounded-xl border border-borderHighlight focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-mono" 
              placeholder="bwalya" 
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div className="mb-2">
            <label className="block text-xs font-bold text-textMuted uppercase tracking-widest mb-3">Passkey</label>
            <input 
              className="w-full p-3.5 bg-background text-textMain rounded-xl border border-borderHighlight focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-mono" 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 mt-4 tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-primary/20">
            {loading ? 'AUTHENTICATING...' : 'INITIALIZE SESSION'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
