import React, { useState, useEffect } from 'react';
import {
  Map, List, Bell, User, Plus, X, Camera, MapPin,
  AlertTriangle, ThumbsUp, Clock, ArrowLeft, CircleDot,
  WifiOff, RefreshCw, AlertCircle,
} from 'lucide-react';
import type { IssueStatus, Category, Issue, TabName } from '../types';
import { STATUS_CONFIG } from '../types';
import { getCategoryById, getTimeAgo } from '../data/mockData';

const photoGradients = [
  'from-slate-300 to-slate-400', 'from-amber-200 to-amber-400',
  'from-gray-300 to-gray-500', 'from-orange-200 to-orange-400',
  'from-blue-200 to-blue-400', 'from-green-200 to-green-400',
  'from-stone-300 to-stone-500', 'from-yellow-200 to-yellow-400',
];
function getPhotoGradient(index: number): string {
  return photoGradients[Math.abs(index) % photoGradients.length];
}

// ─── Status Chip ──────────────────────────────────────────
export function StatusChip({ status, size = 'sm' }: { status: IssueStatus; size?: 'sm' | 'md' | 'lg' }) {
  const config = STATUS_CONFIG[status];
  const sizes = { sm: 'px-2 py-0.5 text-[10px]', md: 'px-2.5 py-1 text-xs', lg: 'px-3 py-1.5 text-sm' };
  return (
    <span className={`inline-flex items-center rounded-full border font-semibold ${config.bg} ${config.color} ${config.border} ${sizes[size]}`}
      role="status" aria-label={`Status: ${config.label}`}>
      {status === 'IN_PROGRESS' && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse-dot" />}
      {config.label}
    </span>
  );
}

// ─── Category Icon ────────────────────────────────────────
export function CategoryIcon({ categoryId, size = 20 }: { categoryId: string; size?: number }) {
  const cat = getCategoryById(categoryId);
  if (!cat) return <CircleDot size={size} />;
  return <span style={{ fontSize: size }} role="img" aria-label={cat.name}>{cat.emoji}</span>;
}

// ─── Issue Card ───────────────────────────────────────────
export function IssueCard({ issue, compact = false, onTap, onFollow }: {
  issue: Issue; compact?: boolean; onTap?: () => void; onFollow?: () => void;
}) {
  const cat = getCategoryById(issue.categoryId);
  const gradient = getPhotoGradient(Math.abs(hashCode(issue.id)));

  return (
    <button onClick={onTap}
      className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] transition-transform overflow-hidden"
      aria-label={`${issue.title}, status: ${STATUS_CONFIG[issue.status].label}`}>
      <div className="flex">
        {/* Photo thumbnail */}
        <div className={`w-20 h-20 flex-shrink-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <span className="text-2xl">{cat?.emoji || '📷'}</span>
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-slate-900 truncate">{issue.title}</h3>
            <StatusChip status={issue.status} />
          </div>
          {!compact && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{issue.address || `${issue.lat.toFixed(4)}, ${issue.lng.toFixed(4)}`}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {issue.distance !== undefined && (
              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                <MapPin size={10} /> {issue.distance} mi
              </span>
            )}
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Clock size={10} /> {getTimeAgo(issue.createdAt)}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <ThumbsUp size={10} /> {issue.voteCount}
            </span>
            {issue.isUnsafeNow && (
              <span className="text-[10px] text-red-500 flex items-center gap-0.5 font-medium">
                <AlertTriangle size={10} /> Unsafe
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export function IssueCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-3">
      <div className="flex">
        <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
        <div className="flex-1 ml-3 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => <IssueCardSkeleton key={i} />)}
    </div>
  );
}

// ─── Bottom Navigation ────────────────────────────────────
export function BottomNav({ activeTab, onTabChange, onReport, notificationCount = 0 }: {
  activeTab: TabName; onTabChange: (tab: TabName) => void; onReport: () => void; notificationCount?: number;
}) {
  const tabs: { tab: TabName; label: string; icon: typeof Map }[] = [
    { tab: 'map', label: 'Map', icon: Map },
    { tab: 'feed', label: 'Feed', icon: List },
  ];

  return (
    <div className="flex items-end bg-white border-t border-slate-200 px-2 pb-1 pt-1" role="tablist">
      {tabs.map(({ tab, label, icon: Icon }) => (
        <button key={tab} onClick={() => onTabChange(tab)}
          className={`flex-1 flex flex-col items-center py-1.5 rounded-lg transition-colors ${
            activeTab === tab ? 'text-primary' : 'text-slate-400'}`}
          role="tab" aria-selected={activeTab === tab} aria-label={label}>
          <Icon size={22} strokeWidth={activeTab === tab ? 2.5 : 1.5} />
          <span className="text-[10px] mt-0.5 font-medium">{label}</span>
        </button>
      ))}

      {/* Center FAB */}
      <div className="flex-1 flex justify-center -mt-5">
        <button onClick={onReport}
          className="w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Report a new issue">
          <Plus size={28} className="text-white" strokeWidth={2.5} />
        </button>
      </div>

      {[
        { tab: 'notifications' as TabName, label: 'Alerts', icon: Bell },
        { tab: 'profile' as TabName, label: 'Profile', icon: User },
      ].map(({ tab, label, icon: Icon }) => (
        <button key={tab} onClick={() => onTabChange(tab)}
          className={`flex-1 flex flex-col items-center py-1.5 rounded-lg transition-colors relative ${
            activeTab === tab ? 'text-primary' : 'text-slate-400'}`}
          role="tab" aria-selected={activeTab === tab} aria-label={label}>
          <Icon size={22} strokeWidth={activeTab === tab ? 2.5 : 1.5} />
          {tab === 'notifications' && notificationCount > 0 && (
            <span className="absolute top-0.5 right-1/4 min-w-[16px] h-4 rounded-full bg-red-500 flex items-center justify-center px-1">
              <span className="text-[8px] text-white font-bold">{notificationCount > 9 ? '9+' : notificationCount}</span>
            </span>
          )}
          <span className="text-[10px] mt-0.5 font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Bottom Sheet ─────────────────────────────────────────
export function BottomSheet({ isOpen, onClose, title, children }: {
  isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" role="dialog" aria-label={title}>
      <div className="backdrop absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl max-h-[85%] overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-bold text-lg text-slate-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
            aria-label="Close">
            <X size={18} className="text-slate-600" />
          </button>
        </div>
        <div className="overflow-y-auto no-scrollbar p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Toggle Switch ────────────────────────────────────────
export function ToggleSwitch({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`toggle-track ${checked ? 'active' : ''}`}
      role="switch" aria-checked={checked} aria-label={label}>
      <div className="toggle-thumb" />
    </button>
  );
}

// ─── Filter Chip ──────────────────────────────────────────
export function FilterChip({ label, selected, onTap }: {
  label: string; selected: boolean; onTap: () => void;
}) {
  return (
    <button onClick={onTap}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        selected
          ? 'bg-primary text-white border-primary'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
      }`} role="checkbox" aria-checked={selected}>
      {label}
    </button>
  );
}

// ─── Category Chip ────────────────────────────────────────
export function CategoryChip({ category, selected, onTap, suggested = false }: {
  category: Category; selected: boolean; onTap: () => void; suggested?: boolean;
}) {
  return (
    <button onClick={onTap}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
        selected
          ? 'border-primary bg-primary-50 shadow-sm'
          : 'border-slate-100 bg-white hover:border-slate-200'
      }`} role="radio" aria-checked={selected}>
      <span className="text-xl">{category.emoji}</span>
      <span className={`font-medium text-sm ${selected ? 'text-primary' : 'text-slate-700'}`}>
        {category.name}
      </span>
      {suggested && (
        <span className="ml-auto text-[10px] font-medium text-primary bg-primary-100 px-2 py-0.5 rounded-full">
          Suggested
        </span>
      )}
    </button>
  );
}

// ─── Severity Slider ──────────────────────────────────────
export function SeveritySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const labels = ['1', '2', '3', '4', '5'];
  const descriptions = ['Minor', 'Low', 'Moderate', 'High', 'Severe'];
  const colors = ['bg-green-400', 'bg-lime-400', 'bg-yellow-400', 'bg-orange-400', 'bg-red-500'];

  return (
    <div className="w-full" role="group" aria-label="Severity level">
      <div className="flex justify-between mb-2">
        {labels.map((l, i) => (
          <button key={l} onClick={() => onChange(i + 1)}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              value >= i + 1 ? `${colors[i]} text-white scale-110` : 'bg-slate-100 text-slate-400'
            }`} aria-label={`Severity ${l}: ${descriptions[i]}`} aria-pressed={value === i + 1}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] text-slate-400">Minor</span>
        <span className="text-xs font-semibold text-primary">{descriptions[value - 1]}</span>
        <span className="text-[10px] text-slate-400">Severe</span>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action, onAction }: {
  icon: typeof Map; title: string; description: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon size={28} className="text-slate-400" />
      </div>
      <h3 className="font-semibold text-slate-700 text-base">{title}</h3>
      <p className="text-sm text-slate-400 mt-1 max-w-xs">{description}</p>
      {action && onAction && (
        <button onClick={onAction}
          className="mt-4 px-5 py-2.5 bg-primary text-white rounded-xl font-medium text-sm active:scale-95 transition-transform">
          {action}
        </button>
      )}
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle size={28} className="text-red-400" />
      </div>
      <h3 className="font-semibold text-slate-700 text-base">Something went wrong</h3>
      <p className="text-sm text-slate-400 mt-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry}
          className="mt-4 px-5 py-2.5 bg-primary text-white rounded-xl font-medium text-sm flex items-center gap-2 active:scale-95 transition-transform">
          <RefreshCw size={16} /> Retry
        </button>
      )}
    </div>
  );
}

// ─── Offline Banner ───────────────────────────────────────
export function OfflineBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2" role="alert">
      <WifiOff size={16} className="text-amber-600 flex-shrink-0" />
      <span className="text-xs text-amber-700 font-medium">Connection is unstable — some features may be limited</span>
    </div>
  );
}

// ─── Header Bar ───────────────────────────────────────────
export function HeaderBar({ title, onBack, rightAction }: {
  title: string; onBack?: () => void; rightAction?: React.ReactNode;
}) {
  return (
    <div className="flex items-center px-4 py-3 bg-white border-b border-slate-100">
      {onBack && (
        <button onClick={onBack} className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center hover:bg-slate-50 mr-1"
          aria-label="Go back">
          <ArrowLeft size={22} className="text-slate-700" />
        </button>
      )}
      <h1 className="font-bold text-lg text-slate-900 flex-1">{title}</h1>
      {rightAction}
    </div>
  );
}

// ─── Phone Frame ──────────────────────────────────────────
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="app-shell">
      {/* Status bar — only renders meaningfully on desktop/preview; real phones have their own */}
      <div className="status-bar bg-white flex items-center justify-between px-6 pt-2 pb-1 text-xs text-slate-800 font-medium flex-shrink-0"
        aria-hidden="true">
        <span className="font-semibold">{time}</span>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[1,2,3,4].map(i => (
              <div key={i} className={`w-0.5 rounded-full ${i <= 3 ? 'bg-slate-800' : 'bg-slate-300'}`}
                style={{ height: `${3 + i}px` }} />
            ))}
          </div>
          <WifiIcon size={12} />
          <BatteryIcon />
        </div>
      </div>
      <div className="app-content flex flex-col flex-1 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}

function WifiIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M2 9.5a14 14 0 0 1 20 0" /><path d="M6 13.5a8 8 0 0 1 12 0" /><circle cx="12" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="18" height="12" viewBox="0 0 24 14" className="text-slate-800">
      <rect x="1" y="1" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="3" y="3" width="14" height="8" rx="1" fill="currentColor" />
      <rect x="22" y="4" width="2" height="6" rx="0.5" fill="currentColor" />
    </svg>
  );
}

// ─── Photo Placeholder ────────────────────────────────────
export function PhotoPlaceholder({ index, className = '' }: { index: number; className?: string }) {
  const gradients = [
    'from-slate-300 to-slate-400', 'from-amber-200 to-amber-400',
    'from-gray-300 to-gray-500', 'from-orange-200 to-orange-400',
    'from-blue-200 to-blue-400', 'from-green-200 to-green-400',
    'from-stone-300 to-stone-500', 'from-yellow-200 to-yellow-400',
    'from-red-200 to-red-400', 'from-purple-200 to-purple-400',
  ];
  return (
    <div className={`bg-gradient-to-br ${gradients[Math.abs(index) % gradients.length]} flex items-center justify-center ${className}`}>
      <Camera size={24} className="text-white/60" />
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────
function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
