import { useState } from 'react';
import { List, CheckCircle2, AlertCircle, Clock, ThumbsUp, MapPin, TrendingUp } from 'lucide-react';
import { StatusChip, IssueCard, EmptyState, Skeleton } from '../components/ui';
import { issues, getCategoryById, getTimeAgo } from '../data/mockData';
import type { Issue } from '../types';

type FeedSegment = 'nearby' | 'following' | 'my_reports';

// ─── Feed Card ────────────────────────────────────────────
function FeedCard({ type, issue, onTap }: {
  type: 'resolved' | 'new' | 'status_change'; issue: Issue; onTap: () => void;
}) {
  const cat = getCategoryById(issue.categoryId);
  const configs = {
    resolved: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Resolved' },
    new: { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50', label: 'New issue' },
    status_change: { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Status update' },
  };
  const config = configs[type];
  const Icon = config.icon;

  return (
    <button onClick={onTap}
      className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform"
      aria-label={`${config.label}: ${issue.title}`}>
      {/* Feed type indicator */}
      <div className={`flex items-center gap-2 px-4 pt-3 pb-1`}>
        <div className={`w-5 h-5 rounded-full ${config.bg} flex items-center justify-center`}>
          <Icon size={12} className={config.color} />
        </div>
        <span className={`text-[10px] font-semibold ${config.color} uppercase tracking-wider`}>
          {config.label}
        </span>
        <span className="text-[10px] text-slate-400 ml-auto">{getTimeAgo(issue.updatedAt)}</span>
      </div>
      {/* Issue info */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm">{cat?.emoji}</span>
          <h3 className="font-semibold text-sm text-slate-900 truncate">{issue.title}</h3>
        </div>
        <div className="flex items-center gap-3">
          <StatusChip status={issue.status} />
          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
            <MapPin size={10} /> {issue.distance} mi
          </span>
          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
            <ThumbsUp size={10} /> {issue.voteCount}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Feed Screen ──────────────────────────────────────────
export function FeedScreen({ onOpenIssue, onSwitchTab, followedIssues = new Set<string>() }: { onOpenIssue: (id: string) => void; onSwitchTab: (tab: 'map' | 'feed' | 'notifications' | 'profile') => void; followedIssues?: Set<string>; }) {
  const [segment, setSegment] = useState<FeedSegment>('nearby');

  const segments: { key: FeedSegment; label: string; icon: typeof List }[] = [
    { key: 'nearby', label: 'Nearby', icon: MapPin },
    { key: 'following', label: 'Following', icon: TrendingUp },
    { key: 'my_reports', label: 'My Reports', icon: List },
  ];

  const feedItems = [
    { type: 'resolved' as const, issue: issues[3] },
    { type: 'status_change' as const, issue: issues[0] },
    { type: 'new' as const, issue: issues[1] },
    { type: 'status_change' as const, issue: issues[5] },
    { type: 'new' as const, issue: issues[4] },
    { type: 'new' as const, issue: issues[6] },
    { type: 'resolved' as const, issue: issues[9] },
    { type: 'status_change' as const, issue: issues[2] },
    { type: 'status_change' as const, issue: issues[7] },
  ];

  const myReports = issues.filter(i => i.reporterUserId === 'user-001');

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">Feed</h1>
        <p className="text-xs text-slate-400 mt-0.5">Updates from your area</p>
      </div>

      {/* Segment control */}
      <div className="flex gap-1 px-4 py-2 border-b border-slate-100 flex-shrink-0">
        {segments.map(seg => (
          <button key={seg.key} onClick={() => setSegment(seg.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              segment === seg.key
                ? 'bg-primary text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`} role="tab" aria-selected={segment === seg.key}>
            {seg.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {segment === 'nearby' && (
          <div className="px-4 py-3 space-y-3">
            {/* Hot spot */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-orange-500" />
                <span className="text-xs font-bold text-orange-700">Hot spot</span>
              </div>
              <p className="text-sm text-orange-900 font-medium">5 issues reported on Main St this week</p>
            </div>

            {feedItems.map((item, i) => (
              <FeedCard key={i} type={item.type} issue={item.issue} onTap={() => onOpenIssue(item.issue.id)} />
            ))}
          </div>
        )}

        {segment === 'following' && (
          followedIssues.size > 0 ? (
            <div className="px-4 py-3 space-y-3">
              {issues.filter(i => followedIssues.has(i.id)).length > 0 ? (
                issues.filter(i => followedIssues.has(i.id)).map(issue => (
                  <FeedCard key={issue.id} type="status_change" issue={issue} onTap={() => onOpenIssue(issue.id)} />
                ))
              ) : (
                <EmptyState icon={TrendingUp} title="No updates yet" description="Issues you follow will show updates here" action="Browse the map" onAction={() => onSwitchTab('map')} />
              )}
            </div>
          ) : (
            <EmptyState icon={TrendingUp} title="Nothing yet" description="Follow issues to get updates in your feed" action="Browse the map" onAction={() => onSwitchTab('map')} />
          )
        )}

        {segment === 'my_reports' && (
          myReports.length > 0 ? (
            <div className="px-4 py-3 space-y-3">
              {/* Status summary */}
              <div className="flex gap-2 mb-2">
                {['SUBMITTED', 'IN_PROGRESS', 'CLOSED'].map(status => {
                  const count = myReports.filter(r => r.status === status).length;
                  if (count === 0) return null;
                  return (
                    <div key={status} className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                      <StatusChip status={status as any} size="sm" />
                      <span className="text-xs font-bold text-slate-700">{count}</span>
                    </div>
                  );
                })}
              </div>
              {myReports.map(issue => (
                <IssueCard key={issue.id} issue={issue} onTap={() => onOpenIssue(issue.id)} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={List}
              title="No reports yet"
              description="Report your first civic issue"
              action="Report an issue"
              onAction={() => onSwitchTab('map')}
            />
          )
        )}
      </div>
    </div>
  );
}
