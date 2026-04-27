import type { Category, Issue, AppNotification, IssueEvent, User, MapFilters, ReportDraft, IssueStatus } from '../types';

// ─── Storage helpers ──────────────────────────────────────
const STORAGE_PREFIX = 'civiclens_';

export function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export function saveState(key: string, value: unknown): void {
  try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); } catch {}
}

// ─── Geolocation helpers ──────────────────────────────────
export function getUserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 40.758, lng: -73.9855 }); // fallback NYC
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: 40.758, lng: -73.9855 }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18`,
      { headers: { 'User-Agent': 'CivicLens/1.0' } }
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// ─── Data ─────────────────────────────────────────────────
export const mockUser: User = {
  id: 'user-001', displayName: 'Alex Rivera', email: 'alex@example.com',
  trustLevel: 'verified', privacyMode: 'exact', isGuest: false, isStaff: false,
  avatarColor: '#0F766E', createdAt: '2024-01-15T10:00:00Z',
};

export const categories: Category[] = [
  { id: 'cat-1', name: 'Pothole', icon: 'circle-dot', emoji: '🕳️', color: '#6B7280', priorityDefault: 3 },
  { id: 'cat-2', name: 'Broken Streetlight', icon: 'lightbulb-off', emoji: '💡', color: '#F59E0B', priorityDefault: 4 },
  { id: 'cat-3', name: 'Illegal Dumping', icon: 'trash-2', emoji: '🗑️', color: '#EF4444', priorityDefault: 4 },
  { id: 'cat-4', name: 'Graffiti', icon: 'pen-tool', emoji: '🎨', color: '#8B5CF6', priorityDefault: 2 },
  { id: 'cat-5', name: 'Unsafe Crossing', icon: 'alert-triangle', emoji: '⚠️', color: '#F97316', priorityDefault: 5 },
  { id: 'cat-6', name: 'Blocked Sidewalk', icon: 'ban', emoji: '🚫', color: '#DC2626', priorityDefault: 3 },
  { id: 'cat-7', name: 'Water Leak', icon: 'droplets', emoji: '💧', color: '#3B82F6', priorityDefault: 4 },
  { id: 'cat-8', name: 'Overgrown Vegetation', icon: 'tree-pine', emoji: '🌿', color: '#22C55E', priorityDefault: 2 },
  { id: 'cat-9', name: 'Missing Sign', icon: 'sign-post', emoji: '🪧', color: '#64748B', priorityDefault: 2 },
  { id: 'cat-10', name: 'Noise Complaint', icon: 'volume-2', emoji: '🔊', color: '#A855F7', priorityDefault: 2 },
  { id: 'cat-11', name: 'Sewer/Drainage', icon: 'waves', emoji: '🌊', color: '#0EA5E9', priorityDefault: 3 },
  { id: 'cat-12', name: 'Other', icon: 'help-circle', emoji: '❓', color: '#94A3B8', priorityDefault: 1 },
];

export const issues: Issue[] = [
  {
    id: 'iss-001', jurisdictionId: 'jur-001', reporterUserId: 'user-001', reporterName: 'Alex Rivera',
    categoryId: 'cat-1', status: 'IN_PROGRESS', title: 'Large pothole on Main St',
    description: 'Deep pothole near the intersection of Main St and 5th Ave. Approximately 2 feet wide and dangerous for cyclists.',
    lat: 40.7580, lng: -73.9855, severity: 4, isUnsafeNow: true, isAnonymous: false,
    createdAt: '2024-03-10T14:30:00Z', updatedAt: '2024-03-12T09:00:00Z',
    visibility: 'PUBLIC', photos: [], followerCount: 24, voteCount: 18, commentCount: 3,
    distance: 0.2, address: 'Main St & 5th Ave, New York, NY',
  },
  {
    id: 'iss-002', jurisdictionId: 'jur-001', reporterUserId: 'user-002', reporterName: 'Maria Chen',
    categoryId: 'cat-2', status: 'SUBMITTED', title: 'Streetlight out on Oak Ave',
    description: 'The streetlight at the corner of Oak Ave and Park Rd has been out for a week. Very dark at night.',
    lat: 40.7614, lng: -73.9776, severity: 3, isUnsafeNow: true, isAnonymous: false,
    createdAt: '2024-03-14T20:15:00Z', updatedAt: '2024-03-14T20:15:00Z',
    visibility: 'PUBLIC', photos: [], followerCount: 8, voteCount: 5, commentCount: 1,
    distance: 0.4, address: 'Oak Ave & Park Rd, New York, NY',
  },
  {
    id: 'iss-003', jurisdictionId: 'jur-001', reporterUserId: 'user-003', reporterName: 'James Wilson',
    categoryId: 'cat-3', status: 'ACKNOWLEDGED', title: 'Mattress dumped near creek',
    description: 'Someone dumped a mattress and several bags of trash near the creek behind Elm St.',
    lat: 40.7549, lng: -73.9840, severity: 3, isUnsafeNow: false, isAnonymous: false,
    createdAt: '2024-03-08T11:00:00Z', updatedAt: '2024-03-09T15:30:00Z',
    visibility: 'PUBLIC', photos: [], followerCount: 12, voteCount: 9, commentCount: 2,
    distance: 0.6, address: 'Elm St Creek Area, New York, NY',
  },
  {
    id: 'iss-004', jurisdictionId: 'jur-001', reporterUserId: 'user-004', reporterName: 'Sarah Kim',
    categoryId: 'cat-5', status: 'CLOSED', title: 'Crosswalk paint faded at school zone',
    description: 'The crosswalk markings near PS 42 are completely faded. Drivers cannot see the crossing.',
    lat: 40.7565, lng: -73.9800, severity: 5, isUnsafeNow: false, isAnonymous: false,
    createdAt: '2024-02-20T08:30:00Z', updatedAt: '2024-03-05T16:00:00Z',
    visibility: 'PUBLIC', photos: [], followerCount: 45, voteCount: 38, commentCount: 7,
    distance: 0.3, address: 'PS 42 School Zone, New York, NY',
  },
  {
    id: 'iss-005', jurisdictionId: 'jur-001', reporterUserId: 'user-005', reporterName: 'Tom Brown',
    categoryId: 'cat-4', status: 'SUBMITTED', title: 'New graffiti on bridge underpass',
    description: 'Fresh graffiti tags appeared on the Washington Bridge underpass overnight.',
    lat: 40.7592, lng: -73.9820, severity: 2, isUnsafeNow: false, isAnonymous: false,
    createdAt: '2024-03-15T07:00:00Z', updatedAt: '2024-03-15T07:00:00Z',
    visibility: 'PUBLIC', photos: [], followerCount: 3, voteCount: 2, commentCount: 0,
    distance: 0.5, address: 'Washington Bridge Underpass, New York, NY',
  },
  {
    id: 'iss-006', jurisdictionId: 'jur-001', reporterUserId: 'user-006', reporterName: 'Linda Garcia',
    categoryId: 'cat-7', status: 'IN_PROGRESS', title: 'Water main break on Pine St',
    description: 'Water bubbling up through the pavement on Pine St between 3rd and 4th. Getting worse.',
    lat: 40.7570, lng: -73.9870, severity: 4, isUnsafeNow: true, isAnonymous: false,
    createdAt: '2024-03-13T06:45:00Z', updatedAt: '2024-03-14T10:00:00Z',
    visibility: 'PUBLIC', photos: [], followerCount: 31, voteCount: 25, commentCount: 5,
    distance: 0.8, address: 'Pine St between 3rd & 4th, New York, NY',
  },
  {
    id: 'iss-007', jurisdictionId: 'jur-001', reporterUserId: 'user-001', reporterName: 'Alex Rivera',
    categoryId: 'cat-6', status: 'SUBMITTED', title: 'Construction blocking sidewalk',
    description: 'Construction fence completely blocks the sidewalk. Pedestrians forced into street.',
    lat: 40.7600, lng: -73.9790, severity: 4, isUnsafeNow: true, isAnonymous: false,
    createdAt: '2024-03-15T12:00:00Z', updatedAt: '2024-03-15T12:00:00Z',
    visibility: 'PUBLIC', photos: [], followerCount: 15, voteCount: 12, commentCount: 4,
    distance: 0.1, address: '123 Broadway, New York, NY',
  },
  {
    id: 'iss-008', jurisdictionId: 'jur-001', reporterUserId: 'user-007', reporterName: 'David Lee',
    categoryId: 'cat-8', status: 'ACKNOWLEDGED', title: 'Overgrown bushes blocking sightline',
    description: 'Bushes at the corner of Cedar Ln have grown so tall drivers cannot see oncoming traffic.',
    lat: 40.7550, lng: -73.9910, severity: 3, isUnsafeNow: false, isAnonymous: false,
    createdAt: '2024-03-06T09:00:00Z', updatedAt: '2024-03-08T14:00:00Z',
    visibility: 'PUBLIC', photos: [], followerCount: 7, voteCount: 4, commentCount: 1,
    distance: 1.2, address: 'Cedar Ln & River Rd, New York, NY',
  },
  {
    id: 'iss-009', jurisdictionId: 'jur-001', reporterUserId: 'user-008', reporterName: 'Emma Davis',
    categoryId: 'cat-5', status: 'REJECTED', title: 'No crosswalk signal',
    description: 'Requesting a crosswalk signal at this intersection. Very busy and dangerous.',
    lat: 40.7620, lng: -73.9840, severity: 5, isUnsafeNow: true, isAnonymous: false,
    createdAt: '2024-03-01T10:00:00Z', updatedAt: '2024-03-03T11:00:00Z',
    visibility: 'PUBLIC', photos: [], followerCount: 56, voteCount: 42, commentCount: 12,
    distance: 0.9, address: '7th Ave & Central, New York, NY',
  },
  {
    id: 'iss-010', jurisdictionId: 'jur-001', reporterUserId: 'user-009', reporterName: 'Anonymous',
    categoryId: 'cat-3', status: 'CLOSED', title: 'Dumped tires near playground',
    description: 'About 8 tires dumped behind the playground fence.',
    lat: 40.7535, lng: -73.9860, severity: 3, isUnsafeNow: false, isAnonymous: true,
    createdAt: '2024-02-15T15:00:00Z', updatedAt: '2024-02-28T09:00:00Z',
    visibility: 'PUBLIC', photos: [], followerCount: 19, voteCount: 14, commentCount: 3,
    distance: 1.5, address: 'Riverside Playground, New York, NY',
  },
];

export const issueEvents: Record<string, IssueEvent[]> = {
  'iss-001': [
    { id: 'evt-1', issueId: 'iss-001', type: 'STATUS_CHANGE', actorName: 'System', payload: { from: null, to: 'SUBMITTED' }, createdAt: '2024-03-10T14:30:00Z' },
    { id: 'evt-2', issueId: 'iss-001', type: 'COMMENT', actorUserId: 'user-002', actorName: 'Maria Chen', payload: { text: 'I almost hit this on my bike yesterday!' }, createdAt: '2024-03-10T18:00:00Z' },
    { id: 'evt-3', issueId: 'iss-001', type: 'STATUS_CHANGE', actorName: 'City Works', payload: { from: 'SUBMITTED', to: 'ACKNOWLEDGED' }, createdAt: '2024-03-11T10:00:00Z' },
    { id: 'evt-4', issueId: 'iss-001', type: 'STAFF_NOTE', actorName: 'Mike R. (DPW)', payload: { text: 'Crew scheduled for Wednesday. Pothole is deep, will need cold patch first then hot mix.' }, createdAt: '2024-03-11T14:00:00Z' },
    { id: 'evt-5', issueId: 'iss-001', type: 'STATUS_CHANGE', actorName: 'City Works', payload: { from: 'ACKNOWLEDGED', to: 'IN_PROGRESS' }, createdAt: '2024-03-12T09:00:00Z' },
    { id: 'evt-6', issueId: 'iss-001', type: 'COMMENT', actorUserId: 'user-003', actorName: 'James Wilson', payload: { text: 'Crew is on site now! Great to see action.' }, createdAt: '2024-03-12T11:30:00Z' },
  ],
  'iss-002': [
    { id: 'evt-7', issueId: 'iss-002', type: 'STATUS_CHANGE', actorName: 'System', payload: { from: null, to: 'SUBMITTED' }, createdAt: '2024-03-14T20:15:00Z' },
    { id: 'evt-8', issueId: 'iss-002', type: 'COMMENT', actorUserId: 'user-005', actorName: 'Tom Brown', payload: { text: 'I noticed this too. Very dark walking home.' }, createdAt: '2024-03-14T21:00:00Z' },
  ],
  'iss-004': [
    { id: 'evt-9', issueId: 'iss-004', type: 'STATUS_CHANGE', actorName: 'System', payload: { from: null, to: 'SUBMITTED' }, createdAt: '2024-02-20T08:30:00Z' },
    { id: 'evt-10', issueId: 'iss-004', type: 'STATUS_CHANGE', actorName: 'City Works', payload: { from: 'SUBMITTED', to: 'ACKNOWLEDGED' }, createdAt: '2024-02-22T10:00:00Z' },
    { id: 'evt-11', issueId: 'iss-004', type: 'STATUS_CHANGE', actorName: 'City Works', payload: { from: 'ACKNOWLEDGED', to: 'IN_PROGRESS' }, createdAt: '2024-02-28T08:00:00Z' },
    { id: 'evt-12', issueId: 'iss-004', type: 'COMMENT', actorName: 'Sarah Kim', payload: { text: 'Crew is repainting the crosswalk! 🎉' }, createdAt: '2024-03-04T14:00:00Z' },
    { id: 'evt-13', issueId: 'iss-004', type: 'STATUS_CHANGE', actorName: 'City Works', payload: { from: 'IN_PROGRESS', to: 'CLOSED' }, createdAt: '2024-03-05T16:00:00Z' },
  ],
};

export const notifications: AppNotification[] = [
  { id: 'notif-1', type: 'status_change', message: 'Your pothole report is now In Progress', issueId: 'iss-001', issueTitle: 'Large pothole on Main St', timestamp: '2024-03-12T09:00:00Z', isRead: false },
  { id: 'notif-2', type: 'comment', message: 'Maria Chen commented on your issue', issueId: 'iss-001', issueTitle: 'Large pothole on Main St', timestamp: '2024-03-10T18:00:00Z', isRead: false },
  { id: 'notif-3', type: 'status_change', message: 'Water main break report acknowledged', issueId: 'iss-006', issueTitle: 'Water main break on Pine St', timestamp: '2024-03-14T10:00:00Z', isRead: true },
  { id: 'notif-4', type: 'city_request', message: 'City asked for more info about your sidewalk report', issueId: 'iss-007', issueTitle: 'Construction blocking sidewalk', timestamp: '2024-03-15T14:00:00Z', isRead: false },
  { id: 'notif-5', type: 'merge', message: 'A similar pothole report was merged with yours', issueId: 'iss-001', issueTitle: 'Large pothole on Main St', timestamp: '2024-03-11T08:00:00Z', isRead: true },
  { id: 'notif-6', type: 'status_change', message: 'Crosswalk paint issue has been resolved! 🎉', issueId: 'iss-004', issueTitle: 'Crosswalk paint faded at school zone', timestamp: '2024-03-05T16:00:00Z', isRead: true },
  { id: 'notif-7', type: 'comment', message: 'James Wilson commented on the pothole', issueId: 'iss-001', issueTitle: 'Large pothole on Main St', timestamp: '2024-03-12T11:30:00Z', isRead: false },
  { id: 'notif-8', type: 'status_change', message: 'Dumped tires near playground report closed', issueId: 'iss-010', issueTitle: 'Dumped tires near playground', timestamp: '2024-02-28T09:00:00Z', isRead: true },
];

export const defaultFilters: MapFilters = { statuses: [], categories: [], sort: 'nearest', showOnlyFollowed: false };

export const duplicateCandidates: Issue[] = [
  {
    id: 'iss-dup-1', jurisdictionId: 'jur-001', reporterUserId: 'user-010', reporterName: 'Sam Patel',
    categoryId: 'cat-1', status: 'ACKNOWLEDGED', title: 'Pothole near Main St intersection',
    description: 'Big pothole forming at the intersection.',
    lat: 40.7582, lng: -73.9853, severity: 3, isUnsafeNow: false, isAnonymous: false,
    createdAt: '2024-03-11T10:00:00Z', updatedAt: '2024-03-12T08:00:00Z',
    visibility: 'PUBLIC', photos: [], followerCount: 6, voteCount: 4, commentCount: 1,
    distance: 0.02, address: 'Main St & 5th Ave, New York, NY',
  },
  {
    id: 'iss-dup-2', jurisdictionId: 'jur-001', reporterUserId: 'user-011', reporterName: 'Chris Moore',
    categoryId: 'cat-1', status: 'SUBMITTED', title: 'Dangerous pothole on Main St',
    description: 'Hit this pothole while driving. Damaged my tire.',
    lat: 40.7578, lng: -73.9857, severity: 4, isUnsafeNow: true, isAnonymous: false,
    createdAt: '2024-03-13T16:00:00Z', updatedAt: '2024-03-13T16:00:00Z',
    visibility: 'PUBLIC', photos: [], followerCount: 10, voteCount: 7, commentCount: 2,
    distance: 0.03, address: 'Main St & 4th Ave, New York, NY',
  },
];

export function getCategoryById(id: string): Category | undefined { return categories.find(c => c.id === id); }
export function getIssueById(id: string): Issue | undefined { return issues.find(i => i.id === id); }

export function getTimeAgo(dateStr: string): string {
  const now = new Date('2024-03-15T18:00:00Z');
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function computeDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
