import { useState, useCallback, useEffect, Component } from 'react';
import type { ReactNode } from 'react';

// ─── Error Boundary ────────────────────────────────────────
type EBProps = { children: ReactNode };
type EBState = { hasError: boolean; error: Error | null };
class ErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return (
      <div className="error-boundary-fallback">
        <h2>Something went wrong</h2>
        <p>CivicLens hit an unexpected error. Your data is safe.</p>
        <pre>{this.state.error?.message}</pre>
        <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}>Reload app</button>
      </div>
    );
    return this.props.children;
  }
}
import { PhoneFrame, BottomNav, OfflineBanner } from './components/ui';
import { SplashScreen, PermissionPrimer, AuthGate } from './screens/Onboarding';
import { MapScreen } from './screens/MapTab';
import { FeedScreen } from './screens/FeedTab';
import { ReportCamera, ReportLocation, ReportCategory, ReportDetails, ReportDuplicates, ReportReview, ReportSuccess } from './screens/ReportTab';
import { NotificationsScreen } from './screens/NotificationsTab';
import { ProfileHome, PrivacySettings, NotificationPrefs, HelpScreen, StaffLogin, StaffQueue, StaffIssueDetail, ExportDataScreen, AccessibilityScreen, ReportAbuseScreen } from './screens/ProfileTab';
import { IssueDetailScreen } from './screens/IssueDetail';
import { mockUser, getUserLocation, loadState, saveState, getCategoryById, issues as allIssues } from './data/mockData';
import { dbInitIfEmpty, dbCreateSession, dbGetSession, dbDestroySession, checkRateLimit, dbExportAllData, dbDeleteAllUserData, dbStorePhoto } from './data/db';
import { notifySubmitSuccess, notifyStatusChange } from './data/notifications';
import { submitIssueToOpen311 } from './data/open311';
import type { TabName, ReportDraft } from './types';

type AppScreen =
  | { type: 'main'; tab: TabName }
  | { type: 'issue_detail'; issueId: string }
  | { type: 'privacy_settings' }
  | { type: 'notification_prefs' }
  | { type: 'help' }
  | { type: 'staff_login' }
  | { type: 'staff_queue' }
  | { type: 'staff_detail'; issueId: string }
  | { type: 'export' }
  | { type: 'accessibility' }
  | { type: 'report_abuse' };

type AppPhase = 'splash' | 'permissions' | 'auth' | 'main';

export default function App() {
  const [phase, setPhase] = useState<AppPhase>(() => {
    const saved = loadState<string>('phase', 'splash');
    return (['splash','permissions','auth','main'].includes(saved) ? saved : 'splash') as AppPhase;
  });
  const [activeTab, setActiveTab] = useState<TabName>('map');
  const [screen, setScreen] = useState<AppScreen>({ type: 'main', tab: 'map' });
  const [user, setUser] = useState(mockUser);
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [reportStep, setReportStep] = useState(0);
  const [isStaff, setIsStaff] = useState(() => loadState('isStaff', false));
  const [userLocation, setUserLocation] = useState({ lat: 40.758, lng: -73.9855 });
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  // ─── Persist auth + detect connectivity ─────────────────
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  useEffect(() => { saveState('phase', phase); }, [phase]);
  useEffect(() => { saveState('isStaff', isStaff); }, [isStaff]);
  const [lastSubmittedId, setLastSubmittedId] = useState('iss-001');

  // ─── Global state (persisted) ──────────────────────────
  const [followedIssues, setFollowedIssues] = useState<Set<string>>(() => new Set(loadState<string[]>('followed', [])));
  const [votedIssues, setVotedIssues] = useState<Map<string, boolean>>(() => new Map(Object.entries(loadState<Record<string, boolean>>('voted', {}))));
  const [issueComments, setIssueComments] = useState<Map<string, string[]>>(() => new Map(Object.entries(loadState<Record<string, string[]>>('comments', {}))));
  const [readNotifications, setReadNotifications] = useState<Set<string>>(() => new Set(loadState<string[]>('readNotifs', [])));

  // ─── GPS on mount ──────────────────────────────────────
  useEffect(() => {
    getUserLocation().then(loc => setUserLocation(loc));
  }, []);

  // ─── Persist state ─────────────────────────────────────
  useEffect(() => { saveState('followed', [...followedIssues]); }, [followedIssues]);
  useEffect(() => { saveState('voted', Object.fromEntries(votedIssues)); }, [votedIssues]);
  useEffect(() => { saveState('comments', Object.fromEntries(issueComments)); }, [issueComments]);
  useEffect(() => { saveState('readNotifs', [...readNotifications]); }, [readNotifications]);

  const toggleFollow = useCallback((id: string) => {
    setFollowedIssues(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const toggleVote = useCallback((id: string) => {
    setVotedIssues(prev => { const n = new Map(prev); n.set(id, !prev.get(id)); return n; });
  }, []);
  const addComment = useCallback((id: string, text: string) => {
    setIssueComments(prev => { const n = new Map(prev); n.set(id, [...(n.get(id) || []), text]); return n; });
  }, []);
  const markRead = useCallback((id: string) => {
    setReadNotifications(prev => { const n = new Set(prev); n.add(id); return n; });
  }, []);
  const markAllRead = useCallback(() => {
    setReadNotifications(new Set(['notif-1','notif-2','notif-3','notif-4','notif-5','notif-6','notif-7','notif-8']));
  }, []);

  // ─── Phase transitions ────────────────────────────────
  const handleSplashFinish = useCallback(() => setPhase('permissions'), []);
  const handlePermsContinue = useCallback(() => setPhase('auth'), []);
  const handlePermsSkip = useCallback(() => setPhase('auth'), []);
  const handleAuthSignIn = useCallback(() => { setUser({ ...mockUser, isGuest: false }); setPhase('main'); }, []);
  const handleAuthGuest = useCallback(() => { setUser({ ...mockUser, isGuest: true, displayName: 'Guest' }); setPhase('main'); }, []);

  // ─── Navigation ───────────────────────────────────────
  const navigateTo = useCallback((s: AppScreen) => setScreen(s), []);
  const openIssue = useCallback((id: string) => navigateTo({ type: 'issue_detail', issueId: id }), [navigateTo]);
  const handleTabChange = useCallback((tab: TabName) => { setActiveTab(tab); setReportStep(0); navigateTo({ type: 'main', tab }); }, [navigateTo]);
  const switchToTab = useCallback((tab: TabName) => { setActiveTab(tab); setReportStep(0); setScreen({ type: 'main', tab }); }, []);

  // ─── Report flow ──────────────────────────────────────
  const startReport = useCallback(() => {
    setReportStep(1);
    setDraft({ lat: userLocation.lat, lng: userLocation.lng, address: '', privacyMode: 'exact', severity: 3, isUnsafeNow: false, note: '', isAnonymous: false });
  }, [userLocation]);
  const updateDraft = useCallback((p: Partial<ReportDraft>) => { setDraft(prev => prev ? { ...prev, ...p } : prev); }, []);
  const handleSubmit = useCallback(() => {
    if (!draft) return;
    const newId = `iss-new-${Date.now()}`;
    const cat = getCategoryById(draft.categoryId || 'cat-12');
    const issueTitle = draft.note ? draft.note.slice(0, 60) : `${cat?.name || 'Issue'} report`;
    const newIssue = {
      id: newId, jurisdictionId: 'jur-001',
      reporterUserId: 'user-001', reporterName: user.isGuest ? 'Guest' : user.displayName,
      categoryId: draft.categoryId || 'cat-12', status: 'SUBMITTED' as const,
      title: issueTitle,
      description: draft.note || 'New civic issue reported',
      lat: draft.lat, lng: draft.lng, severity: draft.severity,
      isUnsafeNow: draft.isUnsafeNow, isAnonymous: draft.isAnonymous,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      visibility: 'PUBLIC' as const, photos: draft.photo ? ['new-photo'] : [],
      followerCount: 1, voteCount: 0, commentCount: 0, distance: 0,
      address: draft.address || `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}`,
    };
    // Push into shared mutable array so getIssueById finds it everywhere
    allIssues.push(newIssue);
    setLastSubmittedId(newId);
    setFollowedIssues(prev => new Set(prev).add(newId));
    setReportStep(7);

    // Dispatch push notification for successful submission
    notifySubmitSuccess({ issueId: newId, issueTitle }).catch(() => {});

    // Auto-submit to Open311 in background
    submitIssueToOpen311({
      id: newId,
      categoryId: draft.categoryId || 'cat-12',
      lat: draft.lat,
      lng: draft.lng,
      description: draft.note || 'New civic issue reported',
      address: draft.address,
    }).catch(() => {});
  }, [draft, user]);
  const editReportStep = useCallback((step: number) => setReportStep(step), []);

  const goHome = useCallback(() => {
    setReportStep(0);
    setDraft(null);
    navigateTo({ type: 'main', tab: activeTab });
  }, [navigateTo, activeTab]);

  // ─── Profile navigation ───────────────────────────────
  const handleProfileNav = useCallback((dest: string) => {
    const map: Record<string, AppScreen> = {
      privacy_settings: { type: 'privacy_settings' },
      notification_prefs: { type: 'notification_prefs' },
      help: { type: 'help' },
      staff_login: { type: 'staff_login' },
      export: { type: 'export' },
      accessibility: { type: 'accessibility' },
      report_abuse: { type: 'report_abuse' },
    };
    const s = map[dest];
    if (s) navigateTo(s);
  }, [navigateTo]);

  const handleStaffLogin = useCallback(() => { setIsStaff(true); navigateTo({ type: 'staff_queue' }); }, [navigateTo]);

  // ─── Back handler + Android hardware back ──────────────
  const handleBack = useCallback(() => {
    if (reportStep > 0 && reportStep <= 6) {
      if (reportStep === 1) setReportStep(0);
      else setReportStep(prev => prev - 1);
      return;
    }
    navigateTo({ type: 'main', tab: activeTab });
  }, [reportStep, navigateTo, activeTab]);
  // Android hardware back button support
  useEffect(() => {
    const onPop = () => handleBack();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [handleBack]);
  useEffect(() => { window.history.replaceState(null, ''); }, [screen, reportStep]);

  // ─── Render phases ────────────────────────────────────
  if (phase === 'splash') return <><SplashScreen onFinish={handleSplashFinish} /></>;
  if (phase === 'permissions') return <><PermissionPrimer onContinue={handlePermsContinue} onSkip={handlePermsSkip} /></>;
  if (phase === 'auth') return <><AuthGate onSignIn={handleAuthSignIn} onGuest={handleAuthGuest} /></>;

  const isReportActive = reportStep > 0 && reportStep <= 7;
  const isSubScreen = screen.type !== 'main';
  const unreadCount = Math.max(0, 8 - readNotifications.size);

  return (
    <ErrorBoundary>
    <PhoneFrame>
      {!isOnline && <OfflineBanner />}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Report flow */}
          {isReportActive && draft && (
            <>
              {reportStep === 1 && <ReportCamera onCapture={photo => { updateDraft({ photo }); setReportStep(2); }} onCancel={() => setReportStep(0)} />}
              {reportStep === 2 && <ReportLocation draft={draft} onUpdate={updateDraft} onContinue={() => setReportStep(3)} onBack={() => setReportStep(1)} userLocation={userLocation} />}
              {reportStep === 3 && <ReportCategory draft={draft} onUpdate={updateDraft} onContinue={() => setReportStep(4)} onBack={() => setReportStep(2)} />}
              {reportStep === 4 && <ReportDetails draft={draft} onUpdate={updateDraft} onContinue={() => setReportStep(5)} onBack={() => setReportStep(3)} />}
              {reportStep === 5 && <ReportDuplicates onFollowExisting={id => { toggleFollow(id); setReportStep(0); setScreen({ type: 'main', tab: 'map' }); }} onProceed={() => setReportStep(6)} />}
              {reportStep === 6 && <ReportReview draft={draft} onSubmit={handleSubmit} onBack={() => setReportStep(5)} onEditStep={editReportStep} />}
              {reportStep === 7 && <ReportSuccess onViewIssue={() => { setReportStep(0); openIssue(lastSubmittedId); }} onClose={goHome} />}
            </>
          )}

          {/* Sub-screens */}
          {!isReportActive && isSubScreen && (
            <>
              {screen.type === 'issue_detail' && (
                <IssueDetailScreen issueId={screen.issueId} onBack={handleBack}
                  isFollowing={followedIssues.has(screen.issueId)} onToggleFollow={() => toggleFollow(screen.issueId)}
                  hasVoted={!!votedIssues.get(screen.issueId)} onToggleVote={() => toggleVote(screen.issueId)}
                  comments={issueComments.get(screen.issueId) || []} onAddComment={t => addComment(screen.issueId, t)}
                  onOpenIssue={openIssue} />
              )}
              {screen.type === 'privacy_settings' && <PrivacySettings onBack={handleBack} />}
              {screen.type === 'notification_prefs' && <NotificationPrefs onBack={handleBack} />}
              {screen.type === 'help' && <HelpScreen onBack={handleBack} onNavigate={handleProfileNav} />}
              {screen.type === 'staff_login' && <StaffLogin onLogin={handleStaffLogin} onBack={handleBack} />}
              {screen.type === 'staff_queue' && <StaffQueue onOpenIssue={id => navigateTo({ type: 'staff_detail', issueId: id })} onBack={handleBack} />}
              {screen.type === 'staff_detail' && <StaffIssueDetail issueId={screen.issueId} onBack={() => navigateTo({ type: 'staff_queue' })} onUpdateStatus={(id: string, newStatus: string) => {
                const issue = allIssues.find(i => i.id === id);
                if (issue) {
                  const oldStatus = issue.status;
                  issue.status = newStatus as any;
                  issue.updatedAt = new Date().toISOString();
                  notifyStatusChange({ issueId: id, issueTitle: issue.title, oldStatus, newStatus }).catch(() => {});
                }
              }} />}
              {screen.type === 'export' && <ExportDataScreen onBack={handleBack} />}
              {screen.type === 'accessibility' && <AccessibilityScreen onBack={handleBack} />}
              {screen.type === 'report_abuse' && <ReportAbuseScreen onBack={handleBack} />}
            </>
          )}

          {/* Main tabs */}
          {!isReportActive && !isSubScreen && (
            <>
              {activeTab === 'map' && <MapScreen onOpenIssue={openIssue} onReport={startReport} followedIssues={followedIssues} />}
              {activeTab === 'feed' && <FeedScreen onOpenIssue={openIssue} onSwitchTab={switchToTab} followedIssues={followedIssues} />}
              {activeTab === 'notifications' && (
                <NotificationsScreen
                  onOpenIssue={(id) => { openIssue(id); }}
                  readNotifications={readNotifications}
                  onMarkRead={markRead}
                  onMarkAllRead={markAllRead}
                />
              )}
              {activeTab === 'profile' && (
                <ProfileHome user={user} onNavigate={handleProfileNav}
                  onLogout={() => { setUser({ ...mockUser, isGuest: true, displayName: 'Guest' }); setPhase('auth'); }}
                  onSignIn={() => setPhase('auth')} isStaff={isStaff} followedCount={followedIssues.size} reportCount={2} />
              )}
            </>
          )}
        </div>

        {!isReportActive && !isSubScreen && (
          <BottomNav activeTab={activeTab} onTabChange={handleTabChange} onReport={startReport} notificationCount={unreadCount} />
        )}
    </PhoneFrame>
    </ErrorBoundary>
  );
}
