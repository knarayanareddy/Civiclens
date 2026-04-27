import { useState } from 'react';
import { User, MapPin, Bell, Shield, HelpCircle, Download, ChevronRight,
  Lock, Eye, EyeOff, LogOut, AlertTriangle, Phone, ExternalLink,
  FileText, Clock, Volume2, CheckCircle2, XCircle, Send } from 'lucide-react';
import { StatusChip, HeaderBar, ToggleSwitch, PhotoPlaceholder } from '../components/ui';
import { issues, categories, getTimeAgo, saveState, loadState } from '../data/mockData';
import type { IssueStatus, PrivacyMode } from '../types';

// ─── Export Data Screen ──────────────────────────────────
function ExportDataScreen({ onBack }: { onBack: () => void }) {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const myReports = issues.filter(i => i.reporterUserId === 'user-001');

  const handleExport = () => {
    setExporting(true);
    const data = {
      exportDate: new Date().toISOString(),
      reports: myReports.map(r => ({ title: r.title, status: r.status, category: r.categoryId, createdAt: r.createdAt, address: r.address })),
      followedIssues: [],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'civiclens-export.json'; a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => { setExporting(false); setExported(true); }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <HeaderBar title="Export Data" onBack={onBack} />
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
          <Download size={28} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 text-center">Your Data, Your Rights</h2>
        <p className="text-sm text-slate-500 mt-2 text-center max-w-xs">
          Download a copy of all your reports, comments, and activity. Compatible with GDPR/CCPA data portability requirements.
        </p>
        <div className="w-full mt-6 p-4 bg-slate-50 rounded-xl">
          <p className="text-xs text-slate-500 font-medium mb-2">Export includes:</p>
          <ul className="space-y-1">
            <li className="text-xs text-slate-600 flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-primary" /> {myReports.length} reports</li>
            <li className="text-xs text-slate-600 flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-primary" /> Report statuses and timelines</li>
            <li className="text-xs text-slate-600 flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-primary" /> Location data (your precision settings applied)</li>
          </ul>
        </div>
        {exported ? (
          <div className="mt-6 flex items-center gap-2 text-green-600 font-semibold text-sm animate-fade-in">
            <CheckCircle2 size={18} /> Download started!
          </div>
        ) : (
          <button onClick={handleExport} disabled={exporting}
            className="mt-6 w-full max-w-xs py-3.5 bg-primary text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.97] transition-transform">
            {exporting ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Preparing…</> : <><Download size={18} /> Export my data</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Accessibility Settings ──────────────────────────────
function AccessibilityScreen({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState(() => loadState('accessibility', { largeText: false, reducedMotion: false, highContrast: false, screenReader: false }));

  const update = (key: string, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveState('accessibility', next);
    if (key === 'reducedMotion') {
      document.documentElement.style.setProperty('--anim-duration', value ? '0s' : '');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <HeaderBar title="Accessibility" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 no-scrollbar">
        {[
          { key: 'largeText', icon: FileText, label: 'Large text', desc: 'Increase text size throughout the app' },
          { key: 'reducedMotion', icon: EyeOff, label: 'Reduced motion', desc: 'Minimize animations and transitions' },
          { key: 'highContrast', icon: Eye, label: 'High contrast', desc: 'Increase color contrast for better readability' },
          { key: 'screenReader', icon: Volume2, label: 'Screen reader hints', desc: 'Additional labels for assistive technology' },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between py-4 border-b border-slate-50">
            <div className="flex items-center gap-3">
              <item.icon size={18} className="text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">{item.label}</p>
                <p className="text-[10px] text-slate-400">{item.desc}</p>
              </div>
            </div>
            <ToggleSwitch checked={!!(settings as any)[item.key]} onChange={v => update(item.key, v)} label={item.label} />
          </div>
        ))}
        <div className="pt-4">
          <p className="text-xs text-slate-400">CivicLens follows WCAG 2.2 accessibility guidelines. All interactive elements have descriptive labels and can be navigated with assistive technologies.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Report Abuse Flow ───────────────────────────────────
function ReportAbuseScreen({ onBack }: { onBack: () => void }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!reason) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex-1 flex flex-col bg-white">
        <HeaderBar title="Report Abuse" onBack={onBack} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in">
          <CheckCircle2 size={48} className="text-green-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-900">Report submitted</h2>
          <p className="text-sm text-slate-500 mt-2 text-center">Thank you. Our team will review this report within 24 hours.</p>
          <button onClick={onBack} className="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-semibold text-sm">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <HeaderBar title="Report Abuse" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
        <div>
          <h3 className="font-semibold text-sm text-slate-700 mb-2">Reason</h3>
          <div className="space-y-2">
            {['Spam or misleading', 'Harassment or hate speech', 'False or malicious report', 'Privacy violation', 'Other'].map(r => (
              <button key={r} onClick={() => setReason(r)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${reason === r ? 'border-primary bg-primary-50 text-primary' : 'border-slate-100 text-slate-600'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-sm text-slate-700 mb-2">Additional details (optional)</h3>
          <textarea value={details} onChange={e => setDetails(e.target.value)}
            placeholder="Describe the issue…" maxLength={500}
            className="w-full h-24 px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>
      <div className="p-5 border-t border-slate-100">
        <button onClick={handleSubmit} disabled={!reason}
          className="w-full py-3.5 bg-red-500 text-white rounded-2xl font-bold text-base disabled:opacity-40 active:scale-[0.97] transition-transform">
          Submit report
        </button>
      </div>
    </div>
  );
}

// ─── Profile Home ────────────────────────────────────────
export function ProfileHome({ user, onNavigate, onLogout, onSignIn, isStaff = false, followedCount = 0, reportCount = 0 }: {
  user: { displayName: string; email?: string; isGuest: boolean; avatarColor: string };
  onNavigate: (screen: string) => void;
  onLogout: () => void;
  onSignIn: () => void;
  isStaff?: boolean;
  followedCount?: number;
  reportCount?: number;
}) {
  const myReports = issues.filter(i => i.reporterUserId === 'user-001');

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg"
            style={{ background: user.avatarColor }}>
            {user.isGuest ? <User size={28} /> : user.displayName[0]}
          </div>
          <div className="flex-1">
            {user.isGuest ? (
              <>
                <h2 className="font-bold text-lg text-slate-900">Guest</h2>
                <button onClick={onSignIn} className="text-sm text-primary font-semibold mt-0.5 active:underline">
                  Sign in to sync across devices
                </button>
              </>
            ) : (
              <>
                <h2 className="font-bold text-lg text-slate-900">{user.displayName}</h2>
                <p className="text-sm text-slate-400">{user.email}</p>
              </>
            )}
          </div>
        </div>
        {!user.isGuest && (
          <div className="flex gap-4 mt-4">
            <div className="flex-1 bg-primary-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-primary">{reportCount || myReports.length}</p>
              <p className="text-[10px] text-primary/60 font-medium">Reports</p>
            </div>
            <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-amber-600">{followedCount}</p>
              <p className="text-[10px] text-amber-600/60 font-medium">Following</p>
            </div>
            <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-green-600">{myReports.filter(r => r.status === 'CLOSED').length}</p>
              <p className="text-[10px] text-green-600/60 font-medium">Resolved</p>
            </div>
          </div>
        )}
      </div>
      <div className="px-5 pb-8">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Settings</h3>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {[
            { icon: MapPin, label: 'Privacy mode', desc: 'Exact location', screen: 'privacy_settings', color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: Bell, label: 'Notification preferences', desc: 'Status changes, comments', screen: 'notification_prefs', color: 'text-amber-600', bg: 'bg-amber-50' },
            { icon: Download, label: 'Export my data', desc: 'Download your reports', screen: 'export', color: 'text-green-600', bg: 'bg-green-50' },
            { icon: Shield, label: 'Accessibility', desc: 'Text size, reduced motion', screen: 'accessibility', color: 'text-purple-600', bg: 'bg-purple-50' },
            { icon: HelpCircle, label: 'Help & Safety', desc: 'Guidelines, report abuse', screen: 'help', color: 'text-slate-600', bg: 'bg-slate-50' },
            { icon: Lock, label: 'Staff portal', desc: isStaff ? 'Logged in — open queue' : 'City staff login', screen: 'staff_login', color: isStaff ? 'text-green-600' : 'text-primary', bg: isStaff ? 'bg-green-50' : 'bg-primary-50' },
          ].map((item, i) => (
            <button key={item.screen} onClick={() => onNavigate(item.screen)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50 transition-colors ${i > 0 ? 'border-t border-slate-50' : ''}`}>
              <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                <item.icon size={18} className={item.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">{item.label}</p>
                <p className="text-[10px] text-slate-400">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          ))}
        </div>
        {!user.isGuest && (
          <button onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 mt-4 py-3 text-red-500 font-medium text-sm rounded-xl border border-red-100 bg-red-50">
            <LogOut size={16} /> Sign out
          </button>
        )}
        <p className="text-center text-[10px] text-slate-300 mt-6">CivicLens v1.0.0 · Made with ❤️ for your community</p>
      </div>
    </div>
  );
}

// ─── Privacy Settings ────────────────────────────────────
export function PrivacySettings({ onBack }: { onBack: () => void }) {
  const [privacy, setPrivacy] = useState<PrivacyMode>(() => loadState('privacyMode', 'exact') as PrivacyMode);
  const [visibility, setVisibility] = useState<string>(() => loadState('visibility', 'public'));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveState('privacyMode', privacy);
    saveState('visibility', visibility);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <HeaderBar title="Privacy" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
        <div>
          <h3 className="font-semibold text-sm text-slate-700 mb-3">Default location precision</h3>
          <div className="space-y-2">
            {[
              { value: 'exact' as PrivacyMode, label: 'Exact location', desc: 'Pin shows exactly where the issue is', icon: Eye },
              { value: 'approximate' as PrivacyMode, label: 'Approximate', desc: 'Block-level accuracy for sensitive reports', icon: MapPin },
              { value: 'hidden' as PrivacyMode, label: 'Hidden', desc: 'Location not shared publicly', icon: EyeOff },
            ].map(opt => (
              <button key={opt.value} onClick={() => setPrivacy(opt.value)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${privacy === opt.value ? 'border-primary bg-primary-50' : 'border-slate-100'}`}>
                <opt.icon size={20} className={privacy === opt.value ? 'text-primary' : 'text-slate-400'} />
                <div className="flex-1">
                  <p className={`font-medium text-sm ${privacy === opt.value ? 'text-primary' : 'text-slate-700'}`}>{opt.label}</p>
                  <p className="text-[10px] text-slate-400">{opt.desc}</p>
                </div>
                {privacy === opt.value && <CheckCircle2 size={18} className="text-primary ml-auto" />}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-sm text-slate-700 mb-3">Visibility</h3>
          <div className="space-y-2">
            {[
              { value: 'public', label: 'Public', desc: 'Visible to everyone in the community' },
              { value: 'city_only', label: 'Private to city', desc: 'Recommended for sensitive categories like homelessness' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setVisibility(opt.value)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-colors text-left ${visibility === opt.value ? 'border-primary bg-primary-50' : 'border-slate-100'}`}>
                <div>
                  <p className={`font-medium text-sm ${visibility === opt.value ? 'text-primary' : 'text-slate-700'}`}>{opt.label}</p>
                  <p className="text-[10px] text-slate-400">{opt.desc}</p>
                </div>
                {visibility === opt.value && <CheckCircle2 size={18} className="text-primary" />}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-5 border-t border-slate-100">
        <button onClick={handleSave}
          className="w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-base active:scale-[0.97] transition-transform">
          {saved ? '✓ Saved' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}

// ─── Notification Preferences ────────────────────────────
export function NotificationPrefs({ onBack }: { onBack: () => void }) {
  const [prefs, setPrefs] = useState(() => loadState('notifPrefs', {
    statusChanges: true, comments: true, nearbyDigest: false, quietHours: false,
  }));
  const [testSent, setTestSent] = useState(false);
  const [permissionState, setPermissionState] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [requesting, setRequesting] = useState(false);

  const updatePref = (key: string, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveState('notifPrefs', next);
  };

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) return;
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermissionState(result);
    } catch {
      setPermissionState('denied');
    }
    setRequesting(false);
  };

  const handleTest = () => {
    setTestSent(true);
    if ('Notification' in window && Notification.permission === 'granted') {
      // Use SW notification for richer experience
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification('CivicLens Test', {
            body: 'Push notifications are working! 🎉 You\'ll be notified when issues are updated.',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'test-notification',
          } as NotificationOptions);
        }).catch(() => {
          new Notification('CivicLens Test', { body: 'Notifications are working! 🎉' });
        });
      } else {
        new Notification('CivicLens Test', { body: 'Notifications are working! 🎉' });
      }
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        setPermissionState(perm);
        if (perm === 'granted') new Notification('CivicLens Test', { body: 'Notifications are working! 🎉' });
      });
    }
    setTimeout(() => setTestSent(false), 3000);
  };

  const permBadge = () => {
    if (permissionState === 'granted') return (
      <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded-xl mb-3">
        <CheckCircle2 size={16} className="text-green-600" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-green-700">Notifications enabled</p>
          <p className="text-[10px] text-green-600/70">Browser permission granted</p>
        </div>
      </div>
    );
    if (permissionState === 'denied') return (
      <div className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-xl mb-3">
        <XCircle size={16} className="text-red-500" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-red-700">Notifications blocked</p>
          <p className="text-[10px] text-red-500/70">Re-enable in browser settings</p>
        </div>
      </div>
    );
    if (permissionState === 'unsupported') return (
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl mb-3">
        <Bell size={16} className="text-slate-400" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-600">Not supported</p>
          <p className="text-[10px] text-slate-400">This browser doesn't support push notifications</p>
        </div>
      </div>
    );
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl mb-3">
        <Bell size={16} className="text-amber-600" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-amber-700">Permission needed</p>
          <p className="text-[10px] text-amber-600/70">Allow notifications to get issue updates</p>
        </div>
        <button onClick={handleRequestPermission} disabled={requesting}
          className="px-3 py-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-lg active:scale-95 transition-transform disabled:opacity-60">
          {requesting ? '…' : 'Enable'}
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <HeaderBar title="Notifications" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 no-scrollbar">
        {permBadge()}
        {[
          { key: 'statusChanges' as const, icon: Volume2, label: 'Status changes', desc: 'When an issue is updated' },
          { key: 'comments' as const, icon: FileText, label: 'Comments', desc: 'When someone comments on your issues' },
          { key: 'nearbyDigest' as const, icon: MapPin, label: 'Nearby digest', desc: 'Weekly summary of issues near you' },
          { key: 'quietHours' as const, icon: Clock, label: 'Quiet hours', desc: 'Silence notifications 10pm–7am' },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between py-4 border-b border-slate-50">
            <div className="flex items-center gap-3">
              <item.icon size={18} className="text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">{item.label}</p>
                <p className="text-[10px] text-slate-400">{item.desc}</p>
              </div>
            </div>
            <ToggleSwitch checked={prefs[item.key]} onChange={v => updatePref(item.key, v)} label={item.label} />
          </div>
        ))}
        <button onClick={handleTest} disabled={permissionState === 'denied' || permissionState === 'unsupported'}
          className="flex items-center gap-3 py-4 w-full text-left active:opacity-70 disabled:opacity-40">
          <Send size={18} className="text-slate-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">Test notification</p>
            <p className="text-[10px] text-slate-400">{testSent ? 'Notification sent! 🎉' : 'Send a test push notification'}</p>
          </div>
          {testSent && <CheckCircle2 size={16} className="text-green-500" />}
        </button>
      </div>
    </div>
  );
}

// ─── Help & Safety ───────────────────────────────────────
export function HelpScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate?: (screen: string) => void }) {
  return (
    <div className="flex-1 flex flex-col bg-white">
      <HeaderBar title="Help & Safety" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-red-600" />
            <h3 className="font-bold text-red-900">Not for emergencies</h3>
          </div>
          <p className="text-sm text-red-700">CivicLens is for non-emergency issues only. Call 911 for immediate threats to life or safety.</p>
          <a href="tel:911" className="mt-3 inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm active:opacity-80">
            <Phone size={16} /> Call 911
          </a>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <h3 className="font-bold text-slate-900 mb-2">What to report</h3>
          <ul className="space-y-2">
            {['Potholes and road damage', 'Broken streetlights', 'Illegal dumping', 'Graffiti', 'Unsafe crossings', 'Blocked sidewalks', 'Water leaks', 'Missing signs'].map(item => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-primary" />{item}</li>
            ))}
          </ul>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <h3 className="font-bold text-slate-900 mb-2">Reporting guidelines</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />Be specific about the location and issue</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />Include a clear photo if possible</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />Check for existing reports before submitting</li>
            <li className="flex items-start gap-2"><XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />Don't include personal information in photos</li>
          </ul>
        </div>
        <button onClick={() => onNavigate?.('report_abuse')}
          className="w-full flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl text-left active:bg-slate-50">
          <AlertTriangle size={18} className="text-amber-500" />
          <div className="flex-1"><p className="font-medium text-sm text-slate-700">Report abuse</p><p className="text-[10px] text-slate-400">Flag inappropriate content or misuse</p></div>
          <ChevronRight size={16} className="text-slate-300" />
        </button>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
          <h3 className="font-bold text-sm text-slate-700">City 311 Number</h3>
          <p className="text-sm text-slate-500 mt-1">For non-emergency city services</p>
          <a href="tel:311" className="mt-2 inline-flex items-center gap-2 text-primary font-semibold text-sm active:underline">
            <Phone size={14} /> 3-1-1 <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Staff Login ─────────────────────────────────────────
export function StaffLogin({ onLogin, onBack }: { onLogin: () => void; onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!email.includes('@')) { setError('Please enter a valid email address'); return; }
    if (password.length < 4) { setError('Password must be at least 4 characters'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <HeaderBar title="Staff Portal" onBack={onBack} />
      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-6">
          <Lock size={28} className="text-primary" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 text-center mb-1">Staff Sign In</h2>
        <p className="text-sm text-slate-400 text-center mb-8">City employees and authorized personnel only</p>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium animate-fade-in">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="staff@city.gov" autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Password</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••" autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
        </div>
        <button onClick={handleLogin} disabled={loading || !email || !password}
          className="w-full mt-6 py-3.5 bg-primary text-white rounded-2xl font-bold text-base disabled:opacity-40 active:scale-[0.97] transition-transform flex items-center justify-center gap-2">
          {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</> : 'Sign in'}
        </button>
        <button onClick={() => window.open('mailto:support@civiclens.app?subject=Staff%20Password%20Reset', '_self')}
          className="mt-4 text-sm text-primary font-medium text-center active:underline">
          Forgot password?
        </button>
      </div>
    </div>
  );
}

// ─── Staff Queue ─────────────────────────────────────────
export function StaffQueue({ onOpenIssue, onBack }: { onOpenIssue: (id: string) => void; onBack: () => void }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredIssues = issues.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && i.categoryId !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-white">
      <HeaderBar title="Staff Queue" onBack={onBack} />
      <div className="px-4 py-2 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600">
          <option value="all">All statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600">
          <option value="all">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
      </div>
      <div className="flex gap-2 px-4 py-2 border-b border-slate-50 flex-shrink-0">
        <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{issues.filter(i => i.status === 'SUBMITTED').length} New</span>
        <span className="text-[10px] font-medium bg-amber-50 text-amber-600 px-2 py-1 rounded-full">{issues.filter(i => i.status === 'ACKNOWLEDGED').length} Ack</span>
        <span className="text-[10px] font-medium bg-orange-50 text-orange-600 px-2 py-1 rounded-full">{issues.filter(i => i.status === 'IN_PROGRESS').length} Active</span>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-4 py-3 space-y-2">
          {filteredIssues.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No issues match these filters</p>
          ) : (
            filteredIssues.map(issue => (
              <button key={issue.id} onClick={() => onOpenIssue(issue.id)}
                className="w-full text-left bg-white rounded-xl border border-slate-100 p-3 active:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{categories.find(c => c.id === issue.categoryId)?.emoji}</span>
                    <span className="text-sm font-medium text-slate-900 truncate">{issue.title}</span>
                  </div>
                  <StatusChip status={issue.status} />
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-slate-400">{getTimeAgo(issue.createdAt)}</span>
                  {issue.isUnsafeNow && <span className="text-[10px] text-red-500 font-medium">⚠️ Unsafe</span>}
                  <span className="text-[10px] text-slate-400">👍 {issue.voteCount}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Staff Issue Detail ──────────────────────────────────
export function StaffIssueDetail({ issueId, onBack, onUpdateStatus }: {
  issueId: string; onBack: () => void; onUpdateStatus?: (issueId: string, status: string) => void;
}) {
  const issue = issues.find(i => i.id === issueId);
  const [status, setStatus] = useState<IssueStatus | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  if (!issue) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-slate-400">Issue not found</p></div>;
  }

  const cat = categories.find(c => c.id === issue.categoryId);

  const handleSave = () => {
    if (status) {
      onUpdateStatus?.(issueId, status);
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); setStatus(null); setNote(''); }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <HeaderBar title="Staff View" onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{cat?.emoji}</span>
            <div>
              <h2 className="font-bold text-lg text-slate-900">{issue.title}</h2>
              <p className="text-xs text-slate-400">Reported by {issue.reporterName} · {getTimeAgo(issue.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusChip status={status || issue.status} size="md" />
            {issue.isUnsafeNow && <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full font-medium">⚠️ Unsafe</span>}
          </div>
          <p className="text-sm text-slate-600">{issue.description}</p>
          <PhotoPlaceholder index={Math.abs(issueId.charCodeAt(5))} className="w-full h-40 rounded-xl" />
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <MapPin size={14} /> {issue.address}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-700 mb-2">Update status</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['ACKNOWLEDGED', 'IN_PROGRESS', 'CLOSED', 'REJECTED'] as IssueStatus[]).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition-colors ${status === s ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 active:bg-slate-50'}`}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-700 mb-2">Staff-only note</h3>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Add internal note (not visible to public)…"
              className="w-full h-20 px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      </div>
      {(status || note) && (
        <div className="p-5 border-t border-slate-100 animate-fade-in">
          <button onClick={handleSave}
            className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-base active:scale-[0.97] transition-transform flex items-center justify-center gap-2">
            {saved ? <><CheckCircle2 size={18} /> Saved!</> : `Save changes${status ? ` → ${status.replace('_', ' ')}` : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Named screen exports for navigation ─────────────────
export { ExportDataScreen, AccessibilityScreen, ReportAbuseScreen };
