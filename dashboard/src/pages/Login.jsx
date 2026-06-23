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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8f9fa] font-sans">
      <div className="bg-white p-10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-[400px] border border-[#e2e8f0]">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-4 shadow-sm bg-white border border-[#e2e8f0] overflow-hidden">
            <img src="/logo.ico" alt="Integrity Guardian Logo" className="w-full h-full object-contain p-2" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#0f172a] tracking-tight">Integrity Guardian</h2>
        </div>

        {error && (
          <div className="bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] mb-5 p-3 rounded text-sm text-center font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">Username</label>
            <input 
              className="w-full p-2.5 bg-[#f8f9fa] text-[#0f172a] rounded-lg border border-[#cbd5e1] focus:bg-white focus:border-[#0052cc] focus:ring-2 focus:ring-[#eff6ff] outline-none transition-all" 
              placeholder="bwalya" 
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div className="mb-2">
            <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">Password</label>
            <input 
              className="w-full p-2.5 bg-[#f8f9fa] text-[#0f172a] rounded-lg border border-[#cbd5e1] focus:bg-white focus:border-[#0052cc] focus:ring-2 focus:ring-[#eff6ff] outline-none transition-all" 
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
            className="w-full bg-[#0052cc] hover:bg-[#0042a3] text-white py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 mt-2 shadow-sm">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
