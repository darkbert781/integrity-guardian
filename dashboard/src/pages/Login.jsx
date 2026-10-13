import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Eye, EyeOff, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';

export function Login({ onLogin }) {
  const navigate = useNavigate();

  // step 1 = credentials, step 2 = OTP
  const [step, setStep]           = useState(1);
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [otp, setOtp]             = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  // ── Step 1: validate credentials and request OTP ─────────────────────────
  const handleCredentials = async () => {
    if (!username.trim()) return setError('Username is required.');
    if (!password)        return setError('Password is required.');
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login/request-otp', { username, password });
      setSessionToken(res.data.session_token);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP to get access token ──────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otp) return setError('Please enter your OTP code.');
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login/verify-otp', { session_token: sessionToken, otp });
      onLogin(res.data.access_token, username);
    } catch (err) {
      const detail = err.response?.data?.detail || 'Verification failed.';
      if (detail.toLowerCase().includes('credential') || detail.toLowerCase().includes('expired')) {
        setStep(1);
        setPassword('');
        setOtp('');
        setError(detail);
      } else {
        setOtp('');
        setError(detail);
      }
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep(1);
    setOtp('');
    setError('');
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F7F6] font-sans relative overflow-hidden">

      <div className="bg-[#FDFCFA] rounded-2xl shadow-xl w-[420px] border border-[#E6EBE9] relative z-10 animate-fade-in-up overflow-hidden">

        {/* ── Progress bar ── */}
        <div className="h-1 bg-[#E6EBE9]">
          <div
            className="h-full bg-[#14B891] transition-all duration-500"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>

        <div className="p-10">

          {/* ── Logo & title ── */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 bg-[#E5F7F1] border border-[#CDEBE0] overflow-hidden">
              <img src="/logo.ico" alt="Integrity Guardian Logo" className="w-full h-full object-contain p-2" />
            </div>
            <h2 className="text-2xl font-bold text-[#101816] tracking-tight">Integrity Guardian</h2>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mt-3">
              <StepDot number={1} active={step === 1} done={step > 1} label="Credentials" />
              <div className="w-8 h-px bg-[#DCE4E1]" />
              <StepDot number={2} active={step === 2} done={false} label="MFA" />
            </div>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 mb-5 p-4 rounded-lg text-sm text-center font-medium">
              {error}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 1 — Username & Password
          ══════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="text-center mb-1">
                <p className="text-sm font-semibold text-[#101816]">Sign in to your account</p>
                <p className="text-xs text-[#667370] mt-1">Step 1 of 2 — Enter your credentials</p>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-[#667370] mb-2">Username</label>
                <input
                  className="w-full p-3.5 bg-[#F7F9F8] text-[#101816] rounded-xl border border-[#DCE4E1] focus:bg-[#FDFCFA] focus:border-[#14B891] focus:ring-4 focus:ring-[#14B891]/10 outline-none transition-all placeholder-[#9AA6A2]"
                  placeholder="Enter username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
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
                    onKeyDown={e => e.key === 'Enter' && handleCredentials()}
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

              {/* Continue */}
              <button
                onClick={handleCredentials}
                disabled={loading}
                className="w-full bg-[#14B891] hover:bg-[#0E7C66] text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? 'Verifying...' : 'Continue'}
                {!loading && <span className="text-white/70">→</span>}
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
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 2 — OTP / MFA
          ══════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              {/* Back button */}
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 text-xs text-[#667370] hover:text-[#0E7C66] transition-colors self-start -mt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              {/* Icon + description */}
              <div className="flex flex-col items-center text-center gap-3 py-2">
                <div className="w-14 h-14 rounded-full bg-[#E5F7F1] border border-[#CDEBE0] flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-[#14B891]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#101816]">Two-Factor Authentication</p>
                  <p className="text-xs text-[#667370] mt-1">
                    Signing in as <span className="font-bold text-[#101816]">{username}</span>
                  </p>
                  <p className="text-xs text-[#667370] mt-1">
                    We just sent a 6-digit verification code to the admin email address.
                  </p>
                </div>
              </div>

              {/* OTP input */}
              <div>
                <label className="block text-sm font-medium text-[#667370] mb-2 flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5" />
                  Email Verification Code
                </label>
                <input
                  className="w-full p-4 bg-[#F7F9F8] text-[#101816] rounded-xl border border-[#DCE4E1] focus:bg-[#FDFCFA] focus:border-[#14B891] focus:ring-4 focus:ring-[#14B891]/10 outline-none transition-all placeholder-[#9AA6A2] font-mono tracking-[0.5em] text-center text-xl"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  autoFocus
                />
                <p className="mt-2 text-[11px] text-[#9AA6A2] text-center">
                  Check your inbox and enter the code above.
                </p>
              </div>

              {/* Verify button */}
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length < 6}
                className="w-full bg-[#14B891] hover:bg-[#0E7C66] text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              {/* OTP progress dots */}
              <div className="flex justify-center gap-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      i < otp.length ? 'bg-[#14B891] scale-110' : 'bg-[#DCE4E1]'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Helper component ──────────────────────────────────────────────────────
function StepDot({ number, active, done, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
        done   ? 'bg-[#14B891] border-[#14B891] text-white' :
        active ? 'bg-white border-[#14B891] text-[#14B891]' :
                 'bg-white border-[#DCE4E1] text-[#9AA6A2]'
      }`}>
        {done ? '✓' : number}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-widest ${
        active ? 'text-[#0E7C66]' : 'text-[#9AA6A2]'
      }`}>{label}</span>
    </div>
  );
}
