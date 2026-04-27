import { useState } from 'react';
import { Bell, RefreshCw, ArrowRight, CheckCircle2, MessageCircle, Merge, MapPin, Megaphone, Trash2 } from 'lucide-react';
import { EmptyState, Skeleton } from '../components/ui';
import { notifications, getTimeAgo } from '../data/mockData';
import type { AppNotification } from '../types';

// ─── Notification Item ────────────────────────────────────
function NotificationItem({ notification, onTap }: {
  notification: AppNotification; onTap: () => void;
}) {
  const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
    status_change: { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50' },
    comment: { icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-50' },
    merge: { icon: Merge, color: 'text-gray-600', bg: 'bg-gray-50' },
    city_request: { icon: Megaphone, color: 'text-amber-600', bg: 'bg-amber-50' },
  };
  const config = typeConfig[notification.type] || typeConfig.status_change;
  const Icon = config.icon;

  return (
    <button onClick={onTap}
      className={`w-full text-left flex items-start gap-3 px-5 py-3.5 border-b border-slate-50 active:bg-slate-50 transition-colors ${
        !notification.isRead ? 'bg-primary-50/30' : ''
      }`} aria-label={`${notification.isRead ? '' : 'Unread: '}${notification.message}`}>
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon size={18} className={config.color} />
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className={`text-sm leading-snug ${!notification.isRead ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
            {notification.message}
          </p>
          {!notification.isRead && (
            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" aria-label="Unread" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-slate-400">{getTimeAgo(notification.timestamp)}</span>
          <span className="text-[10px] text-slate-300">·</span>
          <span className="text-[10px] text-slate-400 truncate">{notification.issueTitle}</span>
        </div>
      </div>
      <ArrowRight size={16} className="text-slate-300 flex-shrink-0 mt-2" />
    </button>
  );
}

// ─── Notifications Screen ─────────────────────────────────
export function NotificationsScreen({ onOpenIssue, readNotifications = new Set<string>(), onMarkRead, onMarkAllRead }: { onOpenIssue: (id: string) => void; readNotifications?: Set<string>; onMarkRead?: (id: string) => void; onMarkAllRead?: () => void; }) {
  const [localReadState, setLocalReadState] = useState<Set<string>>(new Set());
  const items = notifications.map(n => ({ ...n, isRead: n.isRead || readNotifications.has(n.id) || localReadState.has(n.id) }));
  const unreadCount = items.filter(n => !n.isRead).length;

  const handleClearAll = () => {
    setLocalReadState(new Set(notifications.map(n => n.id)));
    onMarkAllRead?.();
  };

  const handleTapNotification = (id: string, issueId: string) => {
    setLocalReadState(prev => new Set(prev).add(id));
    onMarkRead?.(id);
    onOpenIssue(issueId);
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="px-5 pt-3 pb-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={handleClearAll}
              className="text-xs text-primary font-semibold px-3 py-1.5 rounded-lg hover:bg-primary-50"
              aria-label="Mark all as read">
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="Follow issues to get updates when things change"
          />
        ) : (
          <div>
            {items.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onTap={() => handleTapNotification(notification.id, notification.issueId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
