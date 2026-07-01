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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F7F6] font-sans relative overflow-hidden">
      
      <div className="bg-[#FFFFFF] p-10 rounded-2xl shadow-xl w-[420px] border border-[#E6EBE9] relative z-10 animate-fade-in-up">
        
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6 bg-[#E5F7F1] border border-[#CDEBE0] overflow-hidden relative group">
            <img src="/logo.ico" alt="Integrity Guardian Logo" className="w-full h-full object-contain p-2 relative z-10" />
          </div>
          <h2 className="text-3xl font-bold text-[#101816] tracking-tight">Integrity Guardian</h2>
          <p className="text-sm text-[#0E7C66] mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 mb-6 p-4 rounded-lg text-sm text-center font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-medium text-[#667370] mb-2">Username</label>
            <input 
              className="w-full p-3.5 bg-[#F7F9F8] text-[#101816] rounded-xl border border-[#DCE4E1] focus:bg-[#FFFFFF] focus:border-[#14B891] focus:ring-4 focus:ring-[#14B891]/10 outline-none transition-all placeholder-[#9AA6A2]" 
              placeholder="admin" 
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[#667370]">Password</label>
              <a href="#" className="text-sm font-medium text-[#0E7C66] hover:underline">Forgot?</a>
            </div>
            <input 
              className="w-full p-3.5 bg-[#F7F9F8] text-[#101816] rounded-xl border border-[#DCE4E1] focus:bg-[#FFFFFF] focus:border-[#14B891] focus:ring-4 focus:ring-[#14B891]/10 outline-none transition-all placeholder-[#9AA6A2]" 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div className="flex items-center mb-2">
            <input type="checkbox" id="remember" className="w-4 h-4 text-[#14B891] bg-[#F7F9F8] border-[#DCE4E1] rounded focus:ring-[#14B891]" />
            <label htmlFor="remember" className="ml-2 text-sm text-[#667370]">Remember this device</label>
          </div>

          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#14B891] hover:bg-[#0E7C66] text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 mt-2 shadow-sm">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
