import React, { useEffect, useState } from 'react';
import { MapPin, Bell, Shield, ArrowRight, Eye, Smartphone, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { requestNotificationPermission, getNotificationPermission, initNotifications } from '../data/notifications';

// ─── Splash Screen ────────────────────────────────────────
export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    // Initialize notifications system (register SW) on app boot
    initNotifications();
    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-primary via-primary-dark to-primary px-8 animate-fade-in">
      {/* Logo */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/20">
          <div className="relative">
            <MapPin size={44} className="text-white" strokeWidth={2} />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
              <Eye size={12} className="text-amber-900" />
            </div>
          </div>
        </div>
        <div className="absolute -inset-4 rounded-[2rem] bg-white/5 animate-pulse-dot" />
      </div>

      {/* Wordmark */}
      <h1 className="text-4xl font-extrabold text-white tracking-tight">
        Civic<span className="text-amber-300">Lens</span>
      </h1>
      <p className="text-white/70 text-sm mt-2 font-medium tracking-wide">
        Report issues. Track fixes.
      </p>

      {/* Loading */}
      <div className="mt-12 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse-dot" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse-dot" style={{ animationDelay: '300ms' }} />
        <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse-dot" style={{ animationDelay: '600ms' }} />
      </div>

      <p className="text-white/30 text-xs mt-4">v1.0.0</p>
    </div>
  );
}

// ─── Permission Primer ────────────────────────────────────
export function PermissionPrimer({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  const [requesting, setRequesting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied' | 'requesting'>('pending');
  const [notifStatus, setNotifStatus] = useState<'pending' | 'granted' | 'denied' | 'requesting' | 'unsupported'>('pending');

  // Check initial permission states on mount
  useEffect(() => {
    const notifPerm = getNotificationPermission();
    if (notifPerm === 'granted') setNotifStatus('granted');
    else if (notifPerm === 'denied') setNotifStatus('denied');
    else if (notifPerm === 'unsupported') setNotifStatus('unsupported');

    // Check geolocation permission if available
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') setLocationStatus('granted');
        else if (result.state === 'denied') setLocationStatus('denied');
      }).catch(() => {});
    }
  }, []);

  const handleContinue = async () => {
    setRequesting(true);

    // 1. Request geolocation permission
    setLocationStatus('requesting');
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => { setLocationStatus('granted'); resolve(); },
          (err) => {
            setLocationStatus(err.code === 1 ? 'denied' : 'granted');
            resolve(); // continue even if denied
          },
          { timeout: 10000 }
        );
      });
    } catch {
      setLocationStatus('denied');
    }

    // 2. Request notification permission
    setNotifStatus('requesting');
    const notifResult = await requestNotificationPermission();
    setNotifStatus(notifResult === 'granted' ? 'granted' : notifResult === 'denied' ? 'denied' : 'pending');

    // Small delay to show results before transitioning
    setTimeout(() => {
      setRequesting(false);
      onContinue();
    }, 800);
  };

  const statusIcon = (status: string) => {
    if (status === 'granted') return <CheckCircle2 size={16} className="text-green-500" />;
    if (status === 'denied') return <XCircle size={16} className="text-red-400" />;
    if (status === 'requesting') return <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-500 rounded-full animate-spin" />;
    return null;
  };

  return (
    <div className="flex-1 flex flex-col bg-white px-6 py-8 animate-fade-in">
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Illustration */}
        <div className="w-40 h-40 mb-8 relative">
          <div className="absolute inset-0 rounded-full bg-primary-50 flex items-center justify-center">
            <div className="w-28 h-28 rounded-full bg-primary-100 flex items-center justify-center">
              <Smartphone size={48} className="text-primary" />
            </div>
          </div>
          <div className="absolute top-2 right-2 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center animate-float">
            <MapPin size={20} className="text-blue-600" />
          </div>
          <div className="absolute bottom-2 left-2 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center animate-float" style={{ animationDelay: '1s' }}>
            <Bell size={20} className="text-amber-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 text-center">
          A few permissions needed
        </h1>
        <p className="text-slate-500 text-sm mt-2 text-center max-w-xs">
          To report issues accurately and keep you updated, we need a couple of things.
        </p>

        {/* Permission Cards */}
        <div className="w-full space-y-3 mt-8">
          <div className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors ${locationStatus === 'granted' ? 'bg-green-50 border-green-200' : locationStatus === 'denied' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <MapPin size={22} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 text-sm">Location Access</h3>
              <p className="text-blue-700/70 text-xs mt-0.5">Auto-pin issues to the right spot on the map</p>
              {locationStatus === 'denied' && <p className="text-red-500 text-[10px] mt-1 font-medium">Denied — you can enable in Settings</p>}
            </div>
            {statusIcon(locationStatus)}
          </div>

          <div className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors ${notifStatus === 'granted' ? 'bg-green-50 border-green-200' : notifStatus === 'denied' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-100'}`}>
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Bell size={22} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 text-sm">Notifications</h3>
              <p className="text-amber-700/70 text-xs mt-0.5">Get updates when your reported issues are fixed</p>
              {notifStatus === 'denied' && <p className="text-red-500 text-[10px] mt-1 font-medium">Denied — you can enable in Settings</p>}
              {notifStatus === 'unsupported' && <p className="text-slate-400 text-[10px] mt-1 font-medium">Not supported in this browser</p>}
            </div>
            {statusIcon(notifStatus)}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-3 mt-8">
        <button onClick={handleContinue} disabled={requesting}
          className="w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-lg shadow-primary/20 disabled:opacity-70"
          aria-label="Continue and grant permissions">
          {requesting ? (
            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Requesting…</>
          ) : (
            <>Continue <ArrowRight size={18} /></>
          )}
        </button>
        <button onClick={onSkip} disabled={requesting}
          className="w-full py-3 text-slate-500 font-medium text-sm disabled:opacity-50"
          aria-label="Skip permissions">
          Not now
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-4">
        <Shield size={12} className="text-slate-400" />
        <span className="text-[10px] text-slate-400">We never sell your data</span>
      </div>
    </div>
  );
}

// ─── Auth Gate ────────────────────────────────────────────
export function AuthGate({ onSignIn, onGuest }: { onSignIn: () => void; onGuest: () => void }) {
  const [mode, setMode] = useState<'choose' | 'email' | 'code'>('choose');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = () => {
    if (email.length > 3) {
      setLoading(true);
      setTimeout(() => { setLoading(false); setMode('code'); }, 1200);
    }
  };

  const handleVerify = () => {
    if (code.length >= 4) {
      setLoading(true);
      setTimeout(() => { setLoading(false); onSignIn(); }, 1000);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white px-6 py-8 animate-fade-in">
      {mode === 'choose' && (
        <>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center mb-6">
              <MapPin size={36} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 text-center">
              Welcome to CivicLens
            </h1>
            <p className="text-slate-500 text-sm mt-2 text-center max-w-xs">
              Sign in to track your reports and get real-time updates on issues you care about.
            </p>
          </div>
          <div className="space-y-3 mt-8">
            <button onClick={() => setMode('email')}
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-lg shadow-primary/20">
              Sign in with email
              <ChevronRight size={18} />
            </button>
            <button onClick={onGuest}
              className="w-full py-3.5 bg-slate-50 text-slate-700 rounded-2xl font-medium text-base border border-slate-200 active:scale-[0.97] transition-transform">
              Continue as guest
            </button>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <Shield size={12} className="text-slate-400" />
            <span className="text-[10px] text-slate-400">We never sell your data</span>
          </div>
        </>
      )}

      {mode === 'email' && (
        <>
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign in</h2>
            <p className="text-slate-500 text-sm mb-8">We'll send a magic link to your email.</p>
            <label className="text-sm font-medium text-slate-700 mb-2">Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email"
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              aria-label="Email address" />
          </div>
          <div className="space-y-3">
            <button onClick={handleSendCode} disabled={loading || email.length < 4}
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.97] transition-transform">
              {loading ? 'Sending...' : 'Send magic link'}
              <ArrowRight size={18} />
            </button>
            <button onClick={() => setMode('choose')} className="w-full py-3 text-slate-500 font-medium text-sm">
              Back
            </button>
          </div>
        </>
      )}

      {mode === 'code' && (
        <>
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h2>
            <p className="text-slate-500 text-sm mb-8">Enter the verification code we sent to {email}</p>
            <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" inputMode="numeric" autoComplete="one-time-code"
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-2xl text-center tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              aria-label="Verification code" />
          </div>
          <div className="space-y-3">
            <button onClick={handleVerify} disabled={loading || code.length < 4}
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.97] transition-transform">
              {loading ? 'Verifying...' : 'Verify & continue'}
            </button>
            <button onClick={() => setMode('email')} className="w-full py-3 text-slate-500 font-medium text-sm">
              Use a different email
            </button>
          </div>
        </>
      )}
    </div>
  );
}
