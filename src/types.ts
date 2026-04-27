export type IssueStatus = 'SUBMITTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'CLOSED' | 'REJECTED' | 'MERGED';
export type PrivacyMode = 'exact' | 'approximate' | 'hidden';
export type TrustLevel = 'new' | 'verified' | 'staff';
export type MediaType = 'photo' | 'video';
export type EventType = 'STATUS_CHANGE' | 'COMMENT' | 'MERGE' | 'STAFF_NOTE';
export type IntegrationType = 'NONE' | 'OPEN311' | 'EMAIL_BRIDGE' | 'OTHER';
export type Visibility = 'PUBLIC' | 'PRIVATE_TO_CITY' | 'PRIVATE';

export interface User {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  trustLevel: TrustLevel;
  privacyMode: PrivacyMode;
  isGuest: boolean;
  isStaff: boolean;
  avatarColor: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  emoji: string;
  color: string;
  priorityDefault: number;
}

export interface Issue {
  id: string;
  jurisdictionId: string;
  reporterUserId?: string;
  reporterName?: string;
  categoryId: string;
  status: IssueStatus;
  title: string;
  description: string;
  lat: number;
  lng: number;
  severity: number;
  isUnsafeNow: boolean;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  duplicateOfIssueId?: string;
  visibility: Visibility;
  photos: string[];
  followerCount: number;
  voteCount: number;
  commentCount: number;
  distance?: number;
  address?: string;
}

export interface IssueEvent {
  id: string;
  issueId: string;
  type: EventType;
  actorUserId?: string;
  actorName?: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: 'status_change' | 'comment' | 'merge' | 'city_request';
  message: string;
  issueId: string;
  issueTitle: string;
  timestamp: string;
  isRead: boolean;
}

export interface ReportDraft {
  photo?: string;
  photoColor?: string;
  lat: number;
  lng: number;
  address?: string;
  privacyMode: PrivacyMode;
  categoryId?: string;
  severity: number;
  isUnsafeNow: boolean;
  note: string;
  isAnonymous: boolean;
}

export type TabName = 'map' | 'feed' | 'notifications' | 'profile';

export type Screen =
  | { type: 'splash' }
  | { type: 'permission_primer' }
  | { type: 'auth_gate' }
  | { type: 'main'; tab: TabName }
  | { type: 'map_list' }
  | { type: 'map_filters' }
  | { type: 'issue_detail'; issueId: string }
  | { type: 'report_camera' }
  | { type: 'report_location' }
  | { type: 'report_category' }
  | { type: 'report_details' }
  | { type: 'report_duplicates' }
  | { type: 'report_review' }
  | { type: 'privacy_settings' }
  | { type: 'notification_prefs' }
  | { type: 'help' }
  | { type: 'staff_login' }
  | { type: 'staff_queue' }
  | { type: 'staff_detail'; issueId: string };

export interface MapFilters {
  statuses: IssueStatus[];
  categories: string[];
  sort: 'newest' | 'nearest' | 'most_followed';
  showOnlyFollowed: boolean;
}

export const STATUS_CONFIG: Record<IssueStatus, { label: string; color: string; bg: string; border: string }> = {
  SUBMITTED: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  CLOSED: { label: 'Closed', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  MERGED: { label: 'Merged', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
};
