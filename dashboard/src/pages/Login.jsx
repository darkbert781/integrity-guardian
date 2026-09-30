import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Eye, EyeOff } from 'lucide-react';

export function Login({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [otp, setOtp]               = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const handleLogin = async () => {
    if (!username || !password) return setError('Please fill in all fields.');
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { username, password, otp });
      onLogin(res.data.access_token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F7F6] font-sans relative overflow-hidden">

      <div className="bg-[#FDFCFA] p-10 rounded-2xl shadow-xl w-[420px] border border-[#E6EBE9] relative z-10 animate-fade-in-up">

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

        <div className="flex flex-col gap-5">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-[#667370] mb-2">Username</label>
            <input
              className="w-full p-3.5 bg-[#F7F9F8] text-[#101816] rounded-xl border border-[#DCE4E1] focus:bg-[#FDFCFA] focus:border-[#14B891] focus:ring-4 focus:ring-[#14B891]/10 outline-none transition-all placeholder-[#9AA6A2]"
              placeholder="Enter username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-[#667370] mb-2">Password</label>
            <div className="relative">
              <input
                className="w-full p-3.5 bg-[#F7F9F8] text-[#101816] rounded-xl border border-[#DCE4E1] focus:bg-[#FDFCFA] focus:border-[#14B891] focus:ring-4 focus:ring-[#14B891]/10 outline-none transition-all placeholder-[#9AA6A2] pr-12"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9AA6A2] hover:text-[#0E7C66] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* OTP / MFA */}
          <div>
            <label className="block text-sm font-medium text-[#667370] mb-2">
              OTP Code
              <span className="ml-2 text-[10px] font-bold text-[#0E7C66] uppercase tracking-widest bg-[#E5F7F1] border border-[#CDEBE0] px-2 py-0.5 rounded-full">MFA Required</span>
            </label>
            <input
              className="w-full p-3.5 bg-[#F7F9F8] text-[#101816] rounded-xl border border-[#DCE4E1] focus:bg-[#FDFCFA] focus:border-[#14B891] focus:ring-4 focus:ring-[#14B891]/10 outline-none transition-all placeholder-[#9AA6A2] font-mono tracking-widest text-center text-lg"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="one-time-code"
              inputMode="numeric"
            />
            <p className="mt-1.5 text-[11px] text-[#9AA6A2]">Enter the OTP from your account setup.</p>
          </div>

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#14B891] hover:bg-[#0E7C66] text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 mt-1 shadow-sm"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Link to signup */}
          <p className="text-center text-sm text-[#667370]">
            No account yet?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-[#0E7C66] font-bold hover:underline"
            >
              Create Admin Account
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
