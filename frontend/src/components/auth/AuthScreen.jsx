import React, { useState } from 'react';
import {
  Wallet,
  Check,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Building2,
  UserCheck,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

const rawApiBase = import.meta.env.VITE_API_URL || '';
const API_BASE = rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase;

export default function AuthScreen({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  // Sign In Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register School Form States (Compact 2-section)
  const [schoolName, setSchoolName] = useState('');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Shared UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  // Handle Login
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('Please provide both your official email address and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword
        })
      });

      const data = await res.json();

      if (res.ok && data.token && data.user) {
        localStorage.setItem('bursar_token', data.token);
        localStorage.setItem('bursar_user', JSON.stringify(data.user));

        if (onLoginSuccess) {
          onLoginSuccess(data.token, data.user);
        }
      } else {
        setError(data.error || 'Invalid credentials. Please verify your email and password.');
      }
    } catch (err) {
      setError('Unable to reach BURSA servers. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  // Handle School Registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!schoolName.trim() || !schoolPhone.trim()) {
      setError('Please provide complete school profile details.');
      return;
    }

    if (!adminName.trim() || !adminEmail.trim() || !adminPassword) {
      setError('Please provide complete administrator profile details.');
      return;
    }

    if (adminPassword.length < 6) {
      setError('Security requirement: Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register-school`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: schoolName.trim(),
          schoolPhone: schoolPhone.trim(),
          proprietorName: adminName.trim(),
          email: adminEmail.trim(),
          phone: schoolPhone.trim(),
          password: adminPassword
        })
      });

      const data = await res.json();

      if (res.ok && data.token && data.user) {
        localStorage.setItem('bursar_token', data.token);
        localStorage.setItem('bursar_user', JSON.stringify(data.user));

        if (onLoginSuccess) {
          onLoginSuccess(data.token, data.user);
        }
      } else {
        setError(data.error || 'Registration failed. Please verify the provided information.');
      }
    } catch (err) {
      setError('Network connection error during school onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Pitch/Demo Fast-Fill Utility
  const handleDemoFill = (role) => {
    setError(null);
    setInfoMessage(null);
    setAuthMode('login');

    if (role === 'bursar') {
      setLoginEmail('bursar@crownheights.edu.ng');
      setLoginPassword('password123');
    } else if (role === 'proprietor') {
      setLoginEmail('proprietor@crownheights.edu.ng');
      setLoginPassword('password123');
    }
  };

  const handleForgotPassword = () => {
    setInfoMessage('To reset your BURSA password or recover account access, please contact your school administrator or reach out to support@bursa.ng.');
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row font-sans bg-slate-50 text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. Left Showcase Section (BRIGHT Cool Blue & Soft Emerald Tinted Canvas)  */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-[48%] xl:w-[46%] bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/40 p-8 sm:p-12 lg:p-14 border-b lg:border-b-0 lg:border-r border-slate-200/80 text-slate-900 shrink-0 relative overflow-hidden flex flex-col justify-between">
        {/* Soft Ambient Green & Blue Background Accents */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />

        {/* Top: BURSA Brand Identity */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img
              src="/bursar-logo.png"
              alt="BURSA Logo"
              className="w-11 h-11 rounded-xl object-contain shadow-xs shrink-0"
            />
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900">BURSA</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Center: Bright Value Proposition & Product Preview Card */}
        <div className="relative z-10 my-8 lg:my-auto max-w-lg space-y-7">
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              School finances, finally in sync.
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              Collect fees, reconcile payments, manage student ledgers and keep your school’s finances under control from one place.
            </p>
          </div>

          {/* Bright Product Visual Card (Clean White Container + Soft Tints) */}
          <div className="hidden sm:block bg-white border border-slate-200/90 rounded-2xl p-5 shadow-lg shadow-slate-200/50 space-y-4 relative">
            {/* Live Stream Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-slate-700">Automated DVA Reconciliation</span>
              </div>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full">
                First Term 2026/2027
              </span>
            </div>

            {/* Financial Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100">
                <div className="text-[11px] font-medium text-slate-600">Total Fee Revenue Cleared</div>
                <div className="text-lg font-black text-emerald-700 mt-0.5">₦14,850,000</div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> 92% Cleared
                </div>
              </div>
              <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100">
                <div className="text-[11px] font-medium text-slate-600">Suspense Exceptions</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">0 Pending</div>
                <div className="text-[10px] text-blue-700 font-semibold mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-600" /> 100% Matched
                </div>
              </div>
            </div>

            {/* Live Incoming Bank Transfer Card */}
            <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Chinedu Okeke (Primary 4)</div>
                  <div className="text-[11px] text-slate-500 font-mono">Wema DVA • 9924810931</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-emerald-700">+₦120,000</div>
                <div className="text-[9px] font-bold text-emerald-700 uppercase">Auto-Reconciled</div>
              </div>
            </div>
          </div>

          {/* Benefit Indicators (3 items with green checkmarks) */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs sm:text-sm text-slate-700 font-medium">
                Automatic payment reconciliation
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs sm:text-sm text-slate-700 font-medium">
                Real-time fee tracking
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs sm:text-sm text-slate-700 font-medium">
                Secure financial records
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Security Note */}
        <div className="relative z-10 pt-6 border-t border-slate-200/80 flex items-center gap-2 text-xs text-slate-500">
          <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Bank-grade encryption • Direct NIBSS/Paystack settlement.</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Right Auth Section (Clean White Card + Bright Green/Blue Accents)     */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-[52%] xl:w-[54%] flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-slate-50/80 min-h-full">
        <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-3xl p-7 sm:p-10 shadow-xl shadow-slate-200/50 space-y-6">
          {/* Top Mode Segmented Pill Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70">
            <button
              type="button"
              id="tab-sign-in"
              onClick={() => {
                setAuthMode('login');
                setError(null);
                setInfoMessage(null);
              }}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              id="tab-register-school"
              onClick={() => {
                setAuthMode('register');
                setError(null);
                setInfoMessage(null);
              }}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Register School</span>
            </button>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {authMode === 'login' ? 'Welcome back' : 'Register your school'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {authMode === 'login'
                ? 'Sign in to your BURSA account'
                : 'Provision automated virtual accounts for school fee collection.'}
            </p>
          </div>

          {/* Unobtrusive Alert Messages */}
          {error && (
            <div
              id="auth-error-alert"
              className="bg-rose-50 text-rose-800 text-xs sm:text-sm p-3.5 rounded-xl border border-rose-200 flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-snug">{error}</div>
            </div>
          )}

          {infoMessage && (
            <div className="bg-blue-50 text-blue-800 text-xs sm:text-sm p-3.5 rounded-xl border border-blue-200 flex items-start gap-2.5 animate-fadeIn">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-snug">{infoMessage}</div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: Sign In Form                                                       */}
          {/* ========================================================================= */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="bursar@school.edu.ng"
                  required
                  autoComplete="username"
                  className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white transition outline-none"
                />
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl py-2.5 px-3.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 bg-white transition outline-none"
                  />
                  <button
                    type="button"
                    id="toggle-login-password"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none cursor-pointer"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-blue-600 hover:text-blue-700 font-semibold hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary Bright Green Sign In Button */}
              <button
                type="submit"
                id="btn-login-submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3 rounded-xl shadow-md shadow-emerald-600/15 transition flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Pitch Demo Account Fast-Fill Helper */}
              <div className="pt-5 mt-5 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                  Quick Demo Accounts
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    id="quick-bursar"
                    onClick={() => handleDemoFill('bursar')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition cursor-pointer shadow-2xs"
                    title="Populate credentials for Head Bursar"
                  >
                    <span>Head Bursar</span>
                  </button>

                  <button
                    type="button"
                    id="quick-proprietor"
                    onClick={() => handleDemoFill('proprietor')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition cursor-pointer shadow-2xs"
                    title="Populate credentials for School Proprietor"
                  >
                    <span>School Proprietor</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: School Registration Flow                                           */}
          {/* ========================================================================= */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>School Profile</span>
                </div>

                <div>
                  <label
                    htmlFor="reg-school-name"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    School Name
                  </label>
                  <input
                    id="reg-school-name"
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. Crown Heights College"
                    required
                    className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 bg-white transition outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-school-phone"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Official Phone Number
                  </label>
                  <input
                    id="reg-school-phone"
                    type="tel"
                    value={schoolPhone}
                    onChange={(e) => setSchoolPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    required
                    className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 bg-white transition outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Administrator Account</span>
                </div>

                <div>
                  <label
                    htmlFor="reg-admin-name"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Administrator Name
                  </label>
                  <input
                    id="reg-admin-name"
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Mrs. Folashade Adeyemi"
                    required
                    className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 bg-white transition outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-admin-email"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Official Email
                  </label>
                  <input
                    id="reg-admin-email"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="proprietor@school.edu.ng"
                    required
                    className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 bg-white transition outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-admin-password"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Password (min. 6 characters)
                  </label>
                  <div className="relative">
                    <input
                      id="reg-admin-password"
                      type={showAdminPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl py-2 px-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 bg-white transition outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none cursor-pointer"
                    >
                      {showAdminPassword ? (
                        <EyeOff className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                id="btn-register-submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3 rounded-xl shadow-md shadow-emerald-600/15 transition flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Provisioning School Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Institution Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Account & Support Help Text Underneath */}
          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Need assistance or onboarding support?{' '}
            <a
              href="mailto:support@bursa.ng"
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
            >
              Contact BURSA Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
