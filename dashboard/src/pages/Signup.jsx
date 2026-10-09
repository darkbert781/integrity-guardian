import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { UserPlus, CheckCircle, AlertTriangle, Eye, EyeOff, Mail } from 'lucide-react';

export function Signup() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null); // holds { mfa_secret }

  const validate = () => {
    if (!username.trim()) return 'Username is required.';
    if (username.length < 3) return 'Username must be at least 3 characters.';
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    if (!password) return 'Password is required.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSignup = async () => {
    const validationError = validate();
    if (validationError) return setError(validationError);

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/signup', { username, email, password });
      setSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F7F6] font-sans">
        <div className="bg-[#FDFCFA] p-10 rounded-2xl shadow-xl w-[460px] border border-[#E6EBE9] animate-fade-in-up">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#E5F7F1] border border-[#CDEBE0] flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-[#14B891]" />
            </div>
            <h2 className="text-2xl font-bold text-[#101816]">Account Created!</h2>
            <p className="text-sm text-[#667370] mt-2 text-center">
              Your administrator account has been created. An OTP email has been sent to the configured admin address.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">Important — Save This</p>
            </div>
            <p className="text-xs text-amber-700 mb-3 leading-relaxed">
              Multi-Factor Authentication is required to sign in. Use the OTP code below when logging in.
              <br /><span className="font-bold">This will not be shown again.</span>
            </p>
            <div className="bg-white border border-amber-300 rounded-lg p-3 flex items-center justify-between gap-3">
              <span className="text-xs text-[#667370] font-bold uppercase tracking-widest">OTP / MFA Secret</span>
              <code className="text-sm font-mono font-bold text-[#101816] bg-amber-50 px-3 py-1 rounded border border-amber-200 tracking-widest select-all">
                {success.mfa_secret}
              </code>
            </div>
          </div>

          <div className="bg-[#F0FBF8] border border-[#CDEBE0] rounded-xl p-4 mb-6 text-xs text-[#0E7C66] leading-relaxed">
            <strong>Next steps:</strong> Return to the sign-in page and enter your username, password,
            and the OTP code above. Store this secret securely — it is your MFA credential.
          </div>

          <button
            onClick={() => navigate('/login')}
            className="w-full bg-[#14B891] hover:bg-[#0E7C66] text-white py-4 rounded-xl font-bold transition-all shadow-sm"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Signup form ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F7F6] font-sans relative overflow-hidden">
      <div className="bg-[#FDFCFA] p-10 rounded-2xl shadow-xl w-[420px] border border-[#E6EBE9] relative z-10 animate-fade-in-up">

        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 bg-[#E5F7F1] border border-[#CDEBE0] overflow-hidden">
            <img src="/logo.ico" alt="Integrity Guardian Logo" className="w-full h-full object-contain p-2" />
          </div>
          <h2 className="text-2xl font-bold text-[#101816] tracking-tight">Create Admin Account</h2>
          <p className="text-sm text-[#0E7C66] mt-2">Integrity Guardian · First-Time Setup</p>
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
              placeholder="admin"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#667370] mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA6A2] pointer-events-none" />
              <input
                className="w-full pl-10 p-3.5 bg-[#F7F9F8] text-[#101816] rounded-xl border border-[#DCE4E1] focus:bg-[#FDFCFA] focus:border-[#14B891] focus:ring-4 focus:ring-[#14B891]/10 outline-none transition-all placeholder-[#9AA6A2]"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <p className="text-xs text-[#9AA6A2] mt-1.5">Your OTP setup code will be sent to the configured admin email.</p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-[#667370] mb-2">Password</label>
            <div className="relative">
              <input
                className="w-full p-3.5 bg-[#F7F9F8] text-[#101816] rounded-xl border border-[#DCE4E1] focus:bg-[#FDFCFA] focus:border-[#14B891] focus:ring-4 focus:ring-[#14B891]/10 outline-none transition-all placeholder-[#9AA6A2] pr-12"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
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

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-[#667370] mb-2">Confirm Password</label>
            <input
              className="w-full p-3.5 bg-[#F7F9F8] text-[#101816] rounded-xl border border-[#DCE4E1] focus:bg-[#FDFCFA] focus:border-[#14B891] focus:ring-4 focus:ring-[#14B891]/10 outline-none transition-all placeholder-[#9AA6A2]"
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
              autoComplete="new-password"
            />
          </div>

          {/* Password strength hint */}
          {password && (
            <div className="flex gap-1.5 -mt-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    password.length >= [4, 6, 8, 12][i]
                      ? ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-[#14B891]'][i]
                      : 'bg-[#DCE4E1]'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-[#14B891] hover:bg-[#0E7C66] text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 mt-1 shadow-sm flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Link to login */}
          <p className="text-center text-sm text-[#667370]">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-[#0E7C66] font-bold hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
