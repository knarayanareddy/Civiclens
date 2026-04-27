/**
 * Push Notification Manager
 * ──────────────────────────────────────────────────────────────
 * Handles the full client-side notification lifecycle:
 *   • Service Worker registration
 *   • Permission requesting (with state tracking)
 *   • Push subscription management
 *   • Local notification dispatch (for in-app events)
 *   • Notification history in IndexedDB
 *
 * Since we can't send server-side push messages from a client-only
 * PWA, we use the Notification API directly for local notifications
 * and have the full Push API subscription infrastructure ready for
 * when a server is available.
 */

import { loadState, saveState } from './mockData';

// ─── Types ───────────────────────────────────────────────────

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface NotificationConfig {
  statusChanges: boolean;
  comments: boolean;
  nearbyDigest: boolean;
  quietHours: boolean;
  quietStart: number;  // hour (0-23)
  quietEnd: number;    // hour (0-23)
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
  scheduledAt: string;
  sentAt?: string;
  issueId?: string;
}

// ─── Permission Management ───────────────────────────────────

/** Check if the Notification API is available */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** Get the current notification permission state */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionState;
}

/**
 * Request notification permission from the user.
 * Returns the resulting permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return 'unsupported';

  // Already granted
  if (Notification.permission === 'granted') return 'granted';

  // Already denied — user must change in browser settings
  if (Notification.permission === 'denied') return 'denied';

  try {
    const result = await Notification.requestPermission();
    saveState('notif_permission_requested', true);
    saveState('notif_permission_result', result);
    return result as NotificationPermissionState;
  } catch {
    return 'denied';
  }
}

/** Check if user has previously been asked for permission */
export function hasRequestedPermission(): boolean {
  return loadState('notif_permission_requested', false);
}

// ─── Service Worker Registration ─────────────────────────────

let _swRegistration: ServiceWorkerRegistration | null = null;

/** Register the service worker and store the registration */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    _swRegistration = registration;
    console.log('[CivicLens] Service Worker registered:', registration.scope);
    return registration;
  } catch (err) {
    console.error('[CivicLens] SW registration failed:', err);
    return null;
  }
}

/** Get the current SW registration (or register if needed) */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (_swRegistration) return _swRegistration;
  return registerServiceWorker();
}

// ─── Push Subscription ──────────────────────────────────────

/**
 * Subscribe to push notifications.
 * In production, the VAPID public key would come from your server.
 * Returns the PushSubscription or null if not supported/denied.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return null;

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return null;

  try {
    // Check for existing subscription
    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing;

    // In production, use your server's VAPID public key:
    // const VAPID_PUBLIC_KEY = 'your-vapid-public-key';
    // For demo, we create a subscription without applicationServerKey
    // which works for local notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }).catch(() => null);

    if (subscription) {
      saveState('push_subscription', JSON.parse(JSON.stringify(subscription)));
      console.log('[CivicLens] Push subscription created');
    }

    return subscription;
  } catch (err) {
    console.warn('[CivicLens] Push subscription failed:', err);
    return null;
  }
}

/** Unsubscribe from push notifications */
export async function unsubscribeFromPush(): Promise<boolean> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return false;

  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      saveState('push_subscription', null);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Check if currently subscribed to push */
export async function isPushSubscribed(): Promise<boolean> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return false;

  try {
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

// ─── Local Notification Dispatch ─────────────────────────────
// These send real browser notifications for in-app events.

/** Default notification config */
export function getNotificationConfig(): NotificationConfig {
  return loadState<NotificationConfig>('notifPrefs', {
    statusChanges: true,
    comments: true,
    nearbyDigest: false,
    quietHours: false,
    quietStart: 22,
    quietEnd: 7,
  });
}

/** Check if we're currently in quiet hours */
function isQuietHours(): boolean {
  const config = getNotificationConfig();
  if (!config.quietHours) return false;

  const hour = new Date().getHours();
  if (config.quietStart > config.quietEnd) {
    // Wraps midnight (e.g., 22:00 → 07:00)
    return hour >= config.quietStart || hour < config.quietEnd;
  }
  return hour >= config.quietStart && hour < config.quietEnd;
}

/**
 * Send a local notification if permissions and preferences allow.
 * Uses the Notification API directly for instant local dispatch.
 */
export async function sendLocalNotification(params: {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  issueId?: string;
  type?: 'status_change' | 'comment' | 'merge' | 'city_request';
}): Promise<boolean> {
  // Check permission
  if (getNotificationPermission() !== 'granted') return false;

  // Check quiet hours
  if (isQuietHours()) return false;

  // Check user preference for this notification type
  const config = getNotificationConfig();
  if (params.type === 'status_change' && !config.statusChanges) return false;
  if (params.type === 'comment' && !config.comments) return false;

  try {
    // Try using the Service Worker's showNotification (better on mobile)
    const registration = await getServiceWorkerRegistration();
    if (registration) {
      await registration.showNotification(params.title, {
        body: params.body,
        icon: params.icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: params.tag || `civiclens-${Date.now()}`,
        data: {
          url: params.issueId ? `/?issue=${params.issueId}` : '/',
          issueId: params.issueId,
          type: params.type,
        },
      } as NotificationOptions);
      return true;
    }

    // Fallback: direct Notification API
    const notification = new Notification(params.title, {
      body: params.body,
      icon: params.icon || '/icon-192.png',
      tag: params.tag || `civiclens-${Date.now()}`,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (err) {
    console.warn('[CivicLens] Notification dispatch failed:', err);
    return false;
  }
}

// ─── High-level notification helpers ─────────────────────────

/** Notify about an issue status change */
export async function notifyStatusChange(params: {
  issueId: string;
  issueTitle: string;
  oldStatus: string;
  newStatus: string;
}): Promise<boolean> {
  const statusLabels: Record<string, string> = {
    SUBMITTED: 'Submitted',
    ACKNOWLEDGED: 'Acknowledged',
    IN_PROGRESS: 'In Progress',
    CLOSED: 'Resolved',
    REJECTED: 'Rejected',
  };

  const newLabel = statusLabels[params.newStatus] || params.newStatus;

  return sendLocalNotification({
    title: `Issue ${newLabel}`,
    body: params.issueTitle,
    tag: `status-${params.issueId}`,
    issueId: params.issueId,
    type: 'status_change',
  });
}

/** Notify about a new comment */
export async function notifyComment(params: {
  issueId: string;
  issueTitle: string;
  commenterName: string;
}): Promise<boolean> {
  return sendLocalNotification({
    title: `New comment`,
    body: `${params.commenterName} commented on "${params.issueTitle}"`,
    tag: `comment-${params.issueId}-${Date.now()}`,
    issueId: params.issueId,
    type: 'comment',
  });
}

/** Notify about issue submission success */
export async function notifySubmitSuccess(params: {
  issueId: string;
  issueTitle: string;
}): Promise<boolean> {
  return sendLocalNotification({
    title: 'Issue reported! 📍',
    body: `"${params.issueTitle}" — We'll notify you when the city responds.`,
    tag: `submit-${params.issueId}`,
    issueId: params.issueId,
    type: 'status_change',
  });
}

/** Notify when Open311 sync finds a status update */
export async function notifyOpen311Update(params: {
  issueId: string;
  issueTitle: string;
  remoteStatus: string;
}): Promise<boolean> {
  return sendLocalNotification({
    title: 'City update received',
    body: `"${params.issueTitle}" — Status: ${params.remoteStatus}`,
    tag: `open311-${params.issueId}`,
    issueId: params.issueId,
    type: 'status_change',
  });
}

// ─── Init: register SW + request permission on boot ──────────

export async function initNotifications(): Promise<void> {
  await registerServiceWorker();
}
