import { useState } from 'react';
import { ArrowLeft, MapPin, Clock, ThumbsUp, Share2,
  Bookmark, BookmarkCheck, Camera, ChevronRight, AlertTriangle,
  ExternalLink, Send, MoreVertical, User, CheckCircle2, Copy, Link } from 'lucide-react';
import { StatusChip, PhotoPlaceholder } from '../components/ui';
import { getIssueById, getCategoryById, issueEvents, getTimeAgo } from '../data/mockData';
import type { IssueEvent } from '../types';

// ─── Media Carousel ───────────────────────────────────────
function MediaCarousel({ photos, issueIndex }: { photos: string[]; issueIndex: number }) {
  const [active, setActive] = useState(0);
  return (
    <div className="relative">
      <div className="w-full h-56 overflow-hidden">
        <PhotoPlaceholder index={issueIndex} className="w-full h-full" />
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {photos.map((_, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`w-2 h-2 rounded-full transition-colors ${i === active ? 'bg-white' : 'bg-white/40'}`}
            aria-label={`Photo ${i + 1}`} />
        ))}
      </div>
      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full">
        📷 {photos.length}
      </div>
    </div>
  );
}

// ─── Timeline Event ───────────────────────────────────────
function TimelineEvent({ event, isLast }: { event: IssueEvent; isLast: boolean }) {
  const typeConfig: Record<string, { icon: string; color: string; bg: string }> = {
    STATUS_CHANGE: { icon: '🔄', color: 'border-blue-300', bg: 'bg-blue-50' },
    COMMENT: { icon: '💬', color: 'border-slate-200', bg: 'bg-white' },
    MERGE: { icon: '🔗', color: 'border-gray-300', bg: 'bg-gray-50' },
    STAFF_NOTE: { icon: '👷', color: 'border-amber-300', bg: 'bg-amber-50' },
  };
  const config = typeConfig[event.type] || typeConfig.COMMENT;
  const payload = event.payload || {};
  let content = '';
  if (event.type === 'STATUS_CHANGE') {
    const from = (payload as Record<string, unknown>).from;
    const to = (payload as Record<string, unknown>).to;
    content = from ? `Status changed from ${String(from).replace(/_/g, ' ')} to ${String(to).replace(/_/g, ' ')}` : 'Issue submitted';
  } else if (event.type === 'COMMENT' || event.type === 'STAFF_NOTE') {
    content = String((payload as Record<string, unknown>).text || '');
  } else {
    content = String((payload as Record<string, unknown>).text || JSON.stringify(payload));
  }

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${config.bg} border-2 ${config.color} flex items-center justify-center text-sm flex-shrink-0`}>
          {config.icon}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-1" />}
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-slate-700">{event.actorName || 'System'}</span>
          <span className="text-[10px] text-slate-400">{getTimeAgo(event.createdAt)}</span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{content}</p>
      </div>
    </div>
  );
}

// ─── Comment Composer ─────────────────────────────────────
function CommentComposer({ onPost }: { onPost: (text: string) => void }) {
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const quickTags = ['Happened again', 'Worse', 'Fixed?'];

  const handlePost = () => {
    if (!text.trim()) return;
    setPosting(true);
    setTimeout(() => {
      setPosting(false);
      setPosted(true);
      onPost(text);
      setText('');
      setTimeout(() => setPosted(false), 1500);
    }, 600);
  };

  return (
    <div className="border-t border-slate-100 p-4 bg-white">
      {posted && (
        <div className="mb-2 flex items-center gap-1.5 text-green-600 text-xs font-medium animate-fade-in">
          <CheckCircle2 size={14} /> Comment posted!
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        {quickTags.map(tag => (
          <button key={tag} onClick={() => setText(prev => prev ? `${prev} ${tag}` : tag)}
            className="px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600 active:bg-slate-200 transition-colors">
            {tag}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1 flex items-end bg-slate-50 rounded-xl border border-slate-200 px-3 py-2">
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Add a comment..."
            rows={1}
            className="flex-1 text-sm bg-transparent resize-none focus:outline-none max-h-20"
            aria-label="Comment text" />
        </div>
        <button onClick={handlePost} disabled={!text.trim() || posting}
          className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform flex-shrink-0"
          aria-label="Post comment">
          {posting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}

// ─── Options Menu ─────────────────────────────────────────
function OptionsMenu({ onClose, onReportAbuse }: { onClose: () => void; onReportAbuse: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" role="dialog" aria-label="Options">
      <div className="backdrop absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl animate-slide-up p-4 space-y-1">
        <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-3" />
        {[
          { label: 'Copy issue link', icon: Link, action: () => { navigator.clipboard?.writeText(window.location.href); onClose(); } },
          { label: 'Open in maps', icon: MapPin, action: () => { window.open('https://maps.google.com', '_blank'); onClose(); } },
          { label: 'Report abuse', icon: AlertTriangle, action: () => { onReportAbuse(); onClose(); } },
          { label: 'Cancel', icon: ChevronRight, action: onClose },
        ].map(item => (
          <button key={item.label} onClick={item.action}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left active:bg-slate-50 transition-colors">
            <item.icon size={18} className="text-slate-500" />
            <span className={`text-sm font-medium ${item.label === 'Cancel' ? 'text-slate-400' : 'text-slate-700'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Issue Detail Screen ──────────────────────────────────
export function IssueDetailScreen({
  issueId, onBack, isFollowing, onToggleFollow, hasVoted, onToggleVote,
  comments, onAddComment, onOpenIssue,
}: {
  issueId: string; onBack: () => void;
  isFollowing: boolean; onToggleFollow: () => void;
  hasVoted: boolean; onToggleVote: () => void;
  comments: string[]; onAddComment: (text: string) => void;
  onOpenIssue: (id: string) => void;
}) {
  const issue = getIssueById(issueId);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addPhotoMode, setAddPhotoMode] = useState(false);
  const [stillThereOpen, setStillThereOpen] = useState(false);
  const [reportedAbuse, setReportedAbuse] = useState(false);

  if (!issue) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle size={28} className="text-red-400" />
        </div>
        <h2 className="font-bold text-lg text-slate-700">Issue not found</h2>
        <p className="text-sm text-slate-400 mt-1">This issue may have been removed.</p>
        <button onClick={onBack} className="mt-4 px-5 py-2.5 bg-primary text-white rounded-xl font-medium text-sm">
          Go back
        </button>
      </div>
    );
  }

  const cat = getCategoryById(issue.categoryId);
  const events = issueEvents[issueId] || [];
  const issueIndex = Math.abs(issueId.charCodeAt(5));
  const effectiveVoteCount = issue.voteCount + (hasVoted ? 1 : 0);

  const handleCopyLink = () => {
    const url = `https://civiclens.app/issues/${issueId}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => { setCopied(false); setShowShareSheet(false); }, 1500);
  };

  const handleAddPhoto = () => {
    setAddPhotoMode(true);
    setTimeout(() => {
      setAddPhotoMode(false);
      onAddComment('📷 Added a new photo');
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <button onClick={onBack} className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center" aria-label="Back">
          <ArrowLeft size={22} className="text-slate-700" />
        </button>
        <StatusChip status={issue.status} size="md" />
        <button onClick={() => setShowOptions(true)} className="w-9 h-9 rounded-full flex items-center justify-center" aria-label="More options">
          <MoreVertical size={20} className="text-slate-500" />
        </button>
      </div>

      {/* Merged banner */}
      {issue.status === 'MERGED' && (
        <button onClick={() => onOpenIssue('iss-001')}
          className="w-full text-left bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2 active:bg-gray-100">
          <span className="text-sm">🔗</span>
          <span className="text-xs text-gray-700">Merged into Issue #ISS-001</span>
          <ChevronRight size={14} className="text-gray-400 ml-auto" />
        </button>
      )}

      {/* Closed banner */}
      {issue.status === 'CLOSED' && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎉</span>
              <span className="text-sm text-green-800 font-medium">This issue has been resolved</span>
            </div>
            <button onClick={() => setStillThereOpen(!stillThereOpen)}
              className="text-xs text-green-700 font-medium underline">Still there?</button>
          </div>
          {stillThereOpen && (
              <div className="mt-2 p-3 bg-white rounded-lg border border-green-200 animate-fade-in">
              <p className="text-xs text-slate-600 mb-2">Is this issue still present?</p>
              <div className="flex gap-2">
                <button onClick={() => { onAddComment('⚠️ Reporter confirms this issue is still present — requesting reopen'); setStillThereOpen(false); }}
                  className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-semibold active:opacity-80">Yes, reopen</button>
                <button onClick={() => setStillThereOpen(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">No, it's fixed</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Photos */}
        <MediaCarousel photos={issue.photos} issueIndex={issueIndex} />

        <div className="px-5 py-4 space-y-4">
          {/* Title + category */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{cat?.emoji}</span>
              <span className="text-xs text-slate-400 font-medium">{cat?.name}</span>
              {issue.isUnsafeNow && (
                <span className="flex items-center gap-0.5 text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full font-medium">
                  <AlertTriangle size={10} /> Unsafe
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{issue.title}</h1>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Clock size={12} /> {getTimeAgo(issue.createdAt)}</span>
            <span className="flex items-center gap-1"><User size={12} /> {issue.isAnonymous ? 'Anonymous' : issue.reporterName || 'Unknown'}</span>
            {issue.distance !== undefined && <span className="flex items-center gap-1"><MapPin size={12} /> {issue.distance} mi</span>}
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 leading-relaxed">{issue.description}</p>

          {/* Location */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <MapPin size={16} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{issue.address}</p>
              <p className="text-[10px] text-slate-400">{issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}</p>
            </div>
            <button onClick={() => window.open(`https://www.google.com/maps?q=${issue.lat},${issue.lng}`, '_blank')}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center active:bg-slate-50"
              aria-label="Open in maps">
              <ExternalLink size={14} className="text-slate-500" />
            </button>
          </div>

          {/* Severity */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Severity</span>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(n => (
                <div key={n} className={`w-3 h-3 rounded-full ${n <= issue.severity ? 'bg-primary' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 py-2">
            <button onClick={onToggleFollow}
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 transition-colors ${
                isFollowing ? 'bg-primary text-white' : 'bg-slate-50 text-slate-700 border border-slate-200'
              }`} aria-label={isFollowing ? 'Unfollow issue' : 'Follow issue'}>
              {isFollowing ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <button onClick={onToggleVote}
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 transition-colors ${
                hasVoted ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-700 border border-slate-200'
              }`} aria-label={hasVoted ? 'Remove upvote' : 'Upvote priority'}>
              <ThumbsUp size={16} /> {effectiveVoteCount}
            </button>
            <button onClick={handleAddPhoto}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                addPhotoMode ? 'bg-primary text-white' : 'bg-slate-50 border border-slate-200 text-slate-600'
              }`} aria-label="Add photo">
              {addPhotoMode ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera size={18} />}
            </button>
            <button onClick={() => setShowShareSheet(!showShareSheet)}
              className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center"
              aria-label="Share issue">
              <Share2 size={18} className="text-slate-600" />
            </button>
          </div>

          {/* Share sheet */}
          {showShareSheet && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 animate-scale-in">
              <p className="text-sm font-medium text-slate-700">Share this issue</p>
              <div className="flex gap-2">
                <button onClick={handleCopyLink}
                  className="flex-1 py-2.5 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-600 flex items-center justify-center gap-1.5 active:bg-slate-50">
                  {copied ? <><CheckCircle2 size={14} className="text-green-500" /> Copied!</> : <><Copy size={14} /> Copy link</>}
                </button>
                <button onClick={() => {
                  const url = `https://civiclens.app/issues/${issueId}`;
                  const text = `${issue.title} — ${issue.status} on CivicLens`;
                  if (navigator.share) {
                    navigator.share({ title: text, url }).catch(() => {});
                  } else {
                    navigator.clipboard?.writeText(`${text}\n${url}`).catch(() => {});
                  }
                  setShowShareSheet(false);
                }}
                  className="flex-1 py-2.5 bg-primary text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 active:opacity-80">
                  <Share2 size={14} /> Share via…
                </button>
              </div>
            </div>
          )}

          {/* Reported abuse confirmation */}
          {reportedAbuse && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
              <CheckCircle2 size={16} className="text-amber-600" />
              <span className="text-xs text-amber-700 font-medium">Report flagged for review. Thank you.</span>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 py-3 border-t border-b border-slate-100">
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">{issue.followerCount + (isFollowing ? 1 : 0)}</p>
              <p className="text-[10px] text-slate-400">Following</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">{effectiveVoteCount}</p>
              <p className="text-[10px] text-slate-400">Upvotes</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">{issue.commentCount + comments.length}</p>
              <p className="text-[10px] text-slate-400">Comments</p>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="font-bold text-sm text-slate-900 mb-3">Activity</h3>
            <div>
              {[...events].reverse().map((event, i) => (
                <TimelineEvent key={event.id} event={event} isLast={i === events.length - 1 && comments.length === 0} />
              ))}
              {comments.map((comment, i) => (
                <TimelineEvent key={`new-${i}`}
                  event={{
                    id: `new-${i}`, issueId, type: 'COMMENT', actorName: 'You',
                    payload: { text: comment }, createdAt: new Date().toISOString(),
                  }}
                  isLast={i === comments.length - 1} />
              ))}
            </div>
          </div>

          <div className="h-4" />
        </div>
      </div>

      {/* Comment composer */}
      <CommentComposer onPost={onAddComment} />

      {/* Options menu */}
      {showOptions && (
        <OptionsMenu
          onClose={() => setShowOptions(false)}
          onReportAbuse={() => setReportedAbuse(true)}
        />
      )}
    </div>
  );
}
