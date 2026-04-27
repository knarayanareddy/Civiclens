import { openDB, type IDBPDatabase } from 'idb';

const DB = 'civiclens';
const VER = 1;

type Stores = 'issues' | 'users' | 'sessions' | 'photos' | 'settings' | 'audit_log';

let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB, VER, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('issues')) {
        const s = db.createObjectStore('issues', { keyPath: 'id' });
        s.createIndex('status', 'status');
        s.createIndex('category', 'categoryId');
        s.createIndex('latlng', ['lat', 'lng']);
        s.createIndex('reporter', 'reporterUserId');
        s.createIndex('created', 'createdAt');
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'token' });
      }
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('audit_log')) {
        const s = db.createObjectStore('audit_log', { keyPath: 'id', autoIncrement: true });
        s.createIndex('ts', 'timestamp');
        s.createIndex('action', 'action');
      }
    },
  });
  return _db;
}

// ─── Issues ───────────────────────────────────────────────
export async function dbGetIssue(id: string) {
  return (await getDB()).get('issues', id);
}
export async function dbGetAllIssues() {
  return (await getDB()).getAll('issues');
}
export async function dbPutIssue(issue: any) {
  return (await getDB()).put('issues', { ...issue, _searchText: `${issue.title} ${issue.description} ${issue.address}`.toLowerCase() });
}
export async function dbDeleteIssue(id: string) {
  return (await getDB()).delete('issues', id);
}
export async function dbQueryIssues(opts: { status?: string; categoryId?: string; reporterId?: string; limit?: number }) {
  const all = await dbGetAllIssues();
  let filtered = all;
  if (opts.status) filtered = filtered.filter(i => i.status === opts.status);
  if (opts.categoryId) filtered = filtered.filter(i => i.categoryId === opts.categoryId);
  if (opts.reporterId) filtered = filtered.filter(i => i.reporterUserId === opts.reporterId);
  if (opts.limit) filtered = filtered.slice(0, opts.limit);
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export async function dbUpdateIssueStatus(id: string, status: string, note?: string) {
  const issue = await dbGetIssue(id);
  if (!issue) return;
  issue.status = status;
  issue.updatedAt = new Date().toISOString();
  if (note) {
    issue.events = [...(issue.events || []), { type: 'STATUS_CHANGE', actorName: 'Staff', payload: { to: status, note }, createdAt: new Date().toISOString() }];
  }
  await dbPutIssue(issue);
  await dbAudit('issue_status_change', { issueId: id, status, note });
  return issue;
}

// ─── Photos (with EXIF stripping) ─────────────────────────
export async function dbStorePhoto(dataUrl: string, issueId: string): Promise<string> {
  const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // EXIF stripping: re-encode through canvas
  const stripped = await stripExif(dataUrl);
  await (await getDB()).put('photos', { id, issueId, data: stripped, createdAt: new Date().toISOString() });
  return id;
}
export async function dbGetPhoto(id: string) {
  return (await getDB()).get('photos', id);
}
export async function dbGetPhotosForIssue(issueId: string) {
  const all = await (await getDB()).getAll('photos');
  return all.filter((p: any) => p.issueId === issueId);
}

// ─── EXIF Stripping ──────────────────────────────────────
// Canvas.toDataURL() strips all EXIF metadata. This is a real production technique.
export function stripExif(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0);
      // toDataURL('image/jpeg') strips EXIF — no orientation, no GPS, no camera metadata
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl); // fallback if canvas fails
    img.src = dataUrl;
  });
}

// ─── Session / Auth ───────────────────────────────────────
export async function dbCreateSession(user: any) {
  const token = `sess_${Date.now()}_${crypto.getRandomValues(new Uint8Array(16)).join('')}`;
  await (await getDB()).put('sessions', { token, userId: user.id, createdAt: Date.now(), expiresAt: Date.now() + 86400000 });
  localStorage.setItem('civiclens_token', token);
  return token;
}
export async function dbGetSession(): Promise<any> {
  const token = localStorage.getItem('civiclens_token');
  if (!token) return null;
  const sess = await (await getDB()).get('sessions', token);
  if (!sess || sess.expiresAt < Date.now()) {
    localStorage.removeItem('civiclens_token');
    return null;
  }
  return sess;
}
export async function dbDestroySession() {
  const token = localStorage.getItem('civiclens_token');
  if (token) await (await getDB()).delete('sessions', token);
  localStorage.removeItem('civiclens_token');
}

// ─── Rate Limiting ───────────────────────────────────────
export function checkRateLimit(action: string, maxAttempts = 5, windowMs = 60000): { allowed: boolean; remaining: number; retryAfter: number } {
  const key = `civiclens_ratelimit_${action}`;
  const now = Date.now();
  const attempts: number[] = JSON.parse(localStorage.getItem(key) || '[]')
    .filter((t: number) => now - t < windowMs);
  if (attempts.length >= maxAttempts) {
    const oldest = Math.min(...attempts);
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((oldest + windowMs - now) / 1000) };
  }
  attempts.push(now);
  localStorage.setItem(key, JSON.stringify(attempts));
  return { allowed: true, remaining: maxAttempts - attempts.length, retryAfter: 0 };
}

// ─── Privacy: Data Export / Deletion ─────────────────────
export async function dbExportAllData(userId: string) {
  const issues = await dbQueryIssues({ reporterId: userId });
  const photos = [];
  for (const issue of issues) {
    const p = await dbGetPhotosForIssue(issue.id);
    photos.push(...p.map((ph: any) => ({ id: ph.id, issueId: ph.issueId, createdAt: ph.createdAt, hasData: true })));
  }
  return {
    exportDate: new Date().toISOString(),
    user: { id: userId },
    reports: issues.map(i => ({
      id: i.id, title: i.title, status: i.status, category: i.categoryId,
      description: i.description, location: { lat: i.lat, lng: i.lng, address: i.address },
      severity: i.severity, createdAt: i.createdAt, updatedAt: i.updatedAt,
    })),
    photos: photos,
    settings: await dbGetAllSettings(),
  };
}

export async function dbDeleteAllUserData(userId: string) {
  const issues = await dbQueryIssues({ reporterId: userId });
  const db = await getDB();
  const tx = db.transaction(['issues', 'photos'], 'readwrite');
  for (const issue of issues) {
    await tx.objectStore('issues').delete(issue.id);
    const photos = await dbGetPhotosForIssue(issue.id);
    for (const p of photos) await tx.objectStore('photos').delete((p as any).id);
  }
  await tx.done;
  await dbAudit('data_deletion', { userId, issueCount: issues.length });
}

// ─── Settings ────────────────────────────────────────────
export async function dbSetSetting(key: string, value: any) {
  await (await getDB()).put('settings', { key, value, updatedAt: new Date().toISOString() });
}
export async function dbGetSetting(key: string) {
  const row = await (await getDB()).get('settings', key);
  return row?.value ?? null;
}
export async function dbGetAllSettings() {
  return (await getDB()).getAll('settings');
}

// ─── Audit Log ───────────────────────────────────────────
export async function dbAudit(action: string, details: any) {
  await (await getDB()).add('audit_log', {
    action,
    details,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  });
}

// ─── Init: seed mock data if DB is empty ─────────────────
export async function dbInitIfEmpty(mockIssues: any[]) {
  const existing = await dbGetAllIssues();
  if (existing.length > 0) return;
  const db = await getDB();
  const tx = db.transaction('issues', 'readwrite');
  for (const issue of mockIssues) {
    await tx.store.put(issue);
  }
  await tx.done;
}
