/**
 * Open311 GeoReport v2 Connector
 * ──────────────────────────────────────────────────────────────
 * This module implements the full connector pattern for Open311-compliant
 * city integrations.  Since we can't hit a real city endpoint from a
 * client-only PWA, every function works against a realistic local
 * simulation.  The architecture is production-ready: swap the fetch
 * calls for real endpoints and the rest of the code stays identical.
 *
 * Covers:
 *   • Service discovery (GET /discovery)
 *   • Service listing   (GET /services)
 *   • Request creation  (POST /requests)
 *   • Request polling   (GET /requests/{id})
 *   • Status mapping    (Open311 ↔ CivicLens)
 *   • Token flow        (async request creation)
 *   • Offline queue     (IndexedDB-backed retry queue)
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { IssueStatus } from '../types';

// ─── Open311 Types ────────────────────────────────────────────

/** Open311 service discovery endpoint response */
export interface Open311Discovery {
  changeset: string;
  contact: string;
  key_service: string;
  endpoints: Open311Endpoint[];
}

export interface Open311Endpoint {
  specification: string;     // e.g. "http://wiki.open311.org/GeoReport_v2"
  url: string;               // base URL for the endpoint
  changeset: string;
  type: 'production' | 'test';
  formats: string[];         // e.g. ["application/json"]
}

/** Open311 service definition (from GET /services) */
export interface Open311Service {
  service_code: string;
  service_name: string;
  description: string;
  metadata: boolean;         // whether extra attributes are needed
  type: 'realtime' | 'batch' | 'blackbox';
  keywords: string;
  group: string;
}

/** Open311 service request (from GET /requests/{id}) */
export interface Open311ServiceRequest {
  service_request_id: string;
  status: 'open' | 'closed';
  status_notes: string;
  service_name: string;
  service_code: string;
  description: string;
  agency_responsible: string;
  service_notice: string;
  requested_datetime: string;
  updated_datetime: string;
  expected_datetime: string;
  address: string;
  address_id: string;
  zipcode: string;
  lat: number;
  long: number;
  media_url: string;
}

/** POST /requests response (may return token for async flow) */
export interface Open311SubmitResponse {
  service_request_id?: string;
  token?: string;
  service_notice?: string;
  account_id?: string;
}

/** Local record linking a CivicLens issue to its Open311 counterpart */
export interface Open311IntegrationRecord {
  issueId: string;
  jurisdictionId: string;
  serviceRequestId: string | null;
  token: string | null;
  remoteStatus: string;
  lastPolledAt: string;
  rawPayload: Open311ServiceRequest | null;
  createdAt: string;
}

/** Jurisdiction-level Open311 configuration */
export interface Open311JurisdictionConfig {
  jurisdictionId: string;
  jurisdictionName: string;
  discoveryUrl: string;
  baseUrl: string;
  apiKey: string | null;      // some endpoints require an api_key
  format: 'json' | 'xml';
  isActive: boolean;
}

// ─── Status Mapping ──────────────────────────────────────────

const OPEN311_TO_CIVICLENS: Record<string, IssueStatus> = {
  'open':   'SUBMITTED',
  'closed': 'CLOSED',
};

const CIVICLENS_TO_OPEN311: Record<IssueStatus, string> = {
  'SUBMITTED':    'open',
  'ACKNOWLEDGED': 'open',
  'IN_PROGRESS':  'open',
  'CLOSED':       'closed',
  'REJECTED':     'closed',
  'MERGED':       'closed',
};

export function mapOpen311Status(open311Status: string): IssueStatus {
  return OPEN311_TO_CIVICLENS[open311Status] ?? 'SUBMITTED';
}

export function mapCivicLensStatus(status: IssueStatus): string {
  return CIVICLENS_TO_OPEN311[status] ?? 'open';
}

// ─── Category ↔ service_code Mapping ────────────────────────

const CATEGORY_TO_SERVICE_CODE: Record<string, string> = {
  'cat-1':  '001',   // Pothole
  'cat-2':  '002',   // Broken Streetlight
  'cat-3':  '003',   // Illegal Dumping
  'cat-4':  '004',   // Graffiti
  'cat-5':  '005',   // Unsafe Crossing
  'cat-6':  '006',   // Blocked Sidewalk
  'cat-7':  '007',   // Water Leak
  'cat-8':  '008',   // Overgrown Vegetation
  'cat-9':  '009',   // Missing Sign
  'cat-10': '010',   // Noise Complaint
  'cat-11': '011',   // Sewer/Drainage
  'cat-12': '012',   // Other
};

const SERVICE_CODE_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_TO_SERVICE_CODE).map(([k, v]) => [v, k])
);

export function categoryToServiceCode(categoryId: string): string {
  return CATEGORY_TO_SERVICE_CODE[categoryId] ?? '012';
}

export function serviceCodeToCategory(code: string): string {
  return SERVICE_CODE_TO_CATEGORY[code] ?? 'cat-12';
}

// ─── Simulated Open311 Server ────────────────────────────────
// In production, these functions would be real HTTP calls.
// The simulation provides realistic latency and data shapes.

const SIMULATED_SERVICES: Open311Service[] = [
  { service_code: '001', service_name: 'Pothole',              description: 'Report potholes on public roads',              metadata: false, type: 'realtime', keywords: 'road,pothole,damage',      group: 'Roads & Sidewalks' },
  { service_code: '002', service_name: 'Broken Streetlight',   description: 'Report non-functioning streetlights',           metadata: false, type: 'realtime', keywords: 'light,streetlight,dark',    group: 'Lighting' },
  { service_code: '003', service_name: 'Illegal Dumping',      description: 'Report illegal waste dumping',                  metadata: false, type: 'realtime', keywords: 'trash,dumping,waste',       group: 'Sanitation' },
  { service_code: '004', service_name: 'Graffiti',             description: 'Report graffiti on public property',            metadata: false, type: 'realtime', keywords: 'graffiti,vandalism',         group: 'Property' },
  { service_code: '005', service_name: 'Unsafe Crossing',      description: 'Report dangerous pedestrian crossings',         metadata: false, type: 'realtime', keywords: 'crossing,pedestrian,safety', group: 'Traffic' },
  { service_code: '006', service_name: 'Blocked Sidewalk',     description: 'Report obstructions on sidewalks',              metadata: false, type: 'realtime', keywords: 'sidewalk,obstruction',       group: 'Roads & Sidewalks' },
  { service_code: '007', service_name: 'Water Leak',           description: 'Report water main or hydrant leaks',            metadata: false, type: 'realtime', keywords: 'water,leak,hydrant',         group: 'Water' },
  { service_code: '008', service_name: 'Overgrown Vegetation', description: 'Report overgrown trees and bushes on public land', metadata: false, type: 'realtime', keywords: 'tree,bush,overgrown',    group: 'Parks & Green' },
  { service_code: '009', service_name: 'Missing Sign',         description: 'Report missing or damaged traffic signs',       metadata: false, type: 'realtime', keywords: 'sign,traffic,missing',       group: 'Traffic' },
  { service_code: '010', service_name: 'Noise Complaint',      description: 'Report persistent noise disturbances',          metadata: false, type: 'batch',    keywords: 'noise,loud,complaint',       group: 'Complaints' },
  { service_code: '011', service_name: 'Sewer / Drainage',     description: 'Report blocked sewers or drainage issues',      metadata: false, type: 'realtime', keywords: 'sewer,drain,flooding',       group: 'Water' },
  { service_code: '012', service_name: 'Other',                description: 'General civic service request',                 metadata: false, type: 'batch',    keywords: 'general,other',              group: 'General' },
];

const SIMULATED_DISCOVERY: Open311Discovery = {
  changeset: '2024-03-01T00:00:00Z',
  contact: 'support@civiclens.app',
  key_service: 'https://api.civiclens.app/keys',
  endpoints: [
    {
      specification: 'http://wiki.open311.org/GeoReport_v2',
      url: 'https://api.civiclens.app/open311/v2',
      changeset: '2024-03-01T00:00:00Z',
      type: 'production',
      formats: ['application/json'],
    },
  ],
};

// Track simulated remote requests (in-memory)
const _simulatedRequests = new Map<string, Open311ServiceRequest>();

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Open311 Client (Connector) ──────────────────────────────

export class Open311Connector {
  private config: Open311JurisdictionConfig;

  constructor(config: Open311JurisdictionConfig) {
    this.config = config;
  }

  /** GET /discovery — Retrieve service discovery information */
  async discover(): Promise<Open311Discovery> {
    await delay(300 + Math.random() * 200);
    // In production: fetch(`${this.config.discoveryUrl}`)
    console.debug('[Open311] discover()', this.config.discoveryUrl);
    return { ...SIMULATED_DISCOVERY };
  }

  /** GET /services — List all services available in this jurisdiction */
  async getServices(): Promise<Open311Service[]> {
    await delay(200 + Math.random() * 300);
    // In production: fetch(`${this.config.baseUrl}/services.${this.config.format}`)
    console.debug('[Open311] getServices()', this.config.baseUrl);
    return [...SIMULATED_SERVICES];
  }

  /** GET /services/{code} — Get a specific service definition */
  async getService(serviceCode: string): Promise<Open311Service | null> {
    await delay(150);
    return SIMULATED_SERVICES.find(s => s.service_code === serviceCode) ?? null;
  }

  /**
   * POST /requests — Submit a new service request
   *
   * Some Open311 implementations return a service_request_id immediately
   * (realtime), while others return a token for later lookup (batch).
   */
  async createRequest(params: {
    service_code: string;
    lat: number;
    long: number;
    description: string;
    address_string?: string;
    media_url?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  }): Promise<Open311SubmitResponse> {
    await delay(500 + Math.random() * 500);

    const service = SIMULATED_SERVICES.find(s => s.service_code === params.service_code);
    const isBatch = service?.type === 'batch';

    const requestId = `311-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const token = isBatch ? `tok-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` : undefined;

    // Store simulated remote request
    const now = new Date().toISOString();
    _simulatedRequests.set(requestId, {
      service_request_id: requestId,
      status: 'open',
      status_notes: 'Request received and under review',
      service_name: service?.service_name ?? 'Unknown',
      service_code: params.service_code,
      description: params.description,
      agency_responsible: 'Department of Public Works',
      service_notice: 'Estimated response time: 3-5 business days',
      requested_datetime: now,
      updated_datetime: now,
      expected_datetime: new Date(Date.now() + 5 * 86400000).toISOString(),
      address: params.address_string ?? `${params.lat}, ${params.long}`,
      address_id: '',
      zipcode: '',
      lat: params.lat,
      long: params.long,
      media_url: params.media_url ?? '',
    });

    return {
      service_request_id: isBatch ? undefined : requestId,
      token: token,
      service_notice: 'Thank you. Your request has been received.',
    };
  }

  /**
   * GET /tokens/{token} — Retrieve request ID from a batch token
   * (used when createRequest returned only a token)
   */
  async getRequestIdFromToken(token: string): Promise<string | null> {
    await delay(300);
    // Simulate: 70% chance the request is ready
    if (Math.random() > 0.3) {
      return `311-resolved-${token.slice(4)}`;
    }
    return null; // not ready yet
  }

  /** GET /requests/{id} — Poll the status of a single service request */
  async getRequest(requestId: string): Promise<Open311ServiceRequest | null> {
    await delay(200 + Math.random() * 200);

    const req = _simulatedRequests.get(requestId);
    if (req) {
      // Simulate status progression: 20% chance it progressed
      if (Math.random() < 0.2 && req.status === 'open') {
        req.status = 'closed';
        req.status_notes = 'Issue has been resolved by city crew';
        req.updated_datetime = new Date().toISOString();
      }
      return { ...req };
    }

    // Return a plausible response for unknown IDs
    return {
      service_request_id: requestId,
      status: 'open',
      status_notes: 'Under review',
      service_name: 'General',
      service_code: '012',
      description: '',
      agency_responsible: 'City Services',
      service_notice: '',
      requested_datetime: new Date().toISOString(),
      updated_datetime: new Date().toISOString(),
      expected_datetime: new Date(Date.now() + 5 * 86400000).toISOString(),
      address: '',
      address_id: '',
      zipcode: '',
      lat: 0,
      long: 0,
      media_url: '',
    };
  }

  /** GET /requests — Query multiple requests (with optional filters) */
  async getRequests(params?: {
    service_request_id?: string;
    service_code?: string;
    start_date?: string;
    end_date?: string;
    status?: 'open' | 'closed';
  }): Promise<Open311ServiceRequest[]> {
    await delay(300 + Math.random() * 300);

    let results = Array.from(_simulatedRequests.values());

    if (params?.service_code) {
      results = results.filter(r => r.service_code === params.service_code);
    }
    if (params?.status) {
      results = results.filter(r => r.status === params.status);
    }
    if (params?.start_date) {
      const start = new Date(params.start_date).getTime();
      results = results.filter(r => new Date(r.requested_datetime).getTime() >= start);
    }

    return results.map(r => ({ ...r }));
  }
}

// ─── IndexedDB persistence for integration records ──────────

const INTEGRATION_DB = 'civiclens_open311';
const INTEGRATION_VER = 1;

let _integrationDb: IDBPDatabase | null = null;

async function getIntegrationDB(): Promise<IDBPDatabase> {
  if (_integrationDb) return _integrationDb;
  _integrationDb = await openDB(INTEGRATION_DB, INTEGRATION_VER, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('records')) {
        const store = db.createObjectStore('records', { keyPath: 'issueId' });
        store.createIndex('remoteStatus', 'remoteStatus');
        store.createIndex('lastPolledAt', 'lastPolledAt');
      }
      if (!db.objectStoreNames.contains('configs')) {
        db.createObjectStore('configs', { keyPath: 'jurisdictionId' });
      }
      if (!db.objectStoreNames.contains('queue')) {
        const queue = db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        queue.createIndex('status', 'status');
      }
    },
  });
  return _integrationDb;
}

/** Store an integration record linking a CivicLens issue to Open311 */
export async function storeIntegrationRecord(record: Open311IntegrationRecord): Promise<void> {
  const db = await getIntegrationDB();
  await db.put('records', record);
}

/** Get the integration record for a CivicLens issue */
export async function getIntegrationRecord(issueId: string): Promise<Open311IntegrationRecord | undefined> {
  const db = await getIntegrationDB();
  return db.get('records', issueId);
}

/** Get all integration records */
export async function getAllIntegrationRecords(): Promise<Open311IntegrationRecord[]> {
  const db = await getIntegrationDB();
  return db.getAll('records');
}

/** Store a jurisdiction Open311 configuration */
export async function storeJurisdictionConfig(config: Open311JurisdictionConfig): Promise<void> {
  const db = await getIntegrationDB();
  await db.put('configs', config);
}

/** Get a jurisdiction Open311 configuration */
export async function getJurisdictionConfig(jurisdictionId: string): Promise<Open311JurisdictionConfig | undefined> {
  const db = await getIntegrationDB();
  return db.get('configs', jurisdictionId);
}

// ─── Offline Submit Queue ────────────────────────────────────

interface QueuedSubmission {
  id?: number;
  issueId: string;
  serviceCode: string;
  lat: number;
  lng: number;
  description: string;
  address: string;
  status: 'pending' | 'submitted' | 'failed';
  attempts: number;
  createdAt: string;
  lastAttemptAt: string | null;
  error: string | null;
}

/** Queue an issue for Open311 submission (offline-safe) */
export async function queueForSubmission(params: {
  issueId: string;
  serviceCode: string;
  lat: number;
  lng: number;
  description: string;
  address: string;
}): Promise<void> {
  const db = await getIntegrationDB();
  await db.add('queue', {
    ...params,
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString(),
    lastAttemptAt: null,
    error: null,
  });
}

/** Get all pending submissions in the queue */
export async function getPendingSubmissions(): Promise<QueuedSubmission[]> {
  const db = await getIntegrationDB();
  const all = await db.getAllFromIndex('queue', 'status', 'pending');
  return all as QueuedSubmission[];
}

/** Process the offline queue — attempt to submit pending requests */
export async function processSubmissionQueue(connector: Open311Connector): Promise<{
  submitted: number;
  failed: number;
}> {
  const pending = await getPendingSubmissions();
  const db = await getIntegrationDB();
  let submitted = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const response = await connector.createRequest({
        service_code: item.serviceCode,
        lat: item.lat,
        long: item.lng,
        description: item.description,
        address_string: item.address,
      });

      // Store integration record
      await storeIntegrationRecord({
        issueId: item.issueId,
        jurisdictionId: 'jur-001',
        serviceRequestId: response.service_request_id ?? null,
        token: response.token ?? null,
        remoteStatus: 'open',
        lastPolledAt: new Date().toISOString(),
        rawPayload: null,
        createdAt: new Date().toISOString(),
      });

      // Mark as submitted
      await db.put('queue', {
        ...item,
        status: 'submitted',
        lastAttemptAt: new Date().toISOString(),
      });
      submitted++;
    } catch (err) {
      await db.put('queue', {
        ...item,
        status: item.attempts >= 3 ? 'failed' : 'pending',
        attempts: item.attempts + 1,
        lastAttemptAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      failed++;
    }
  }

  return { submitted, failed };
}

// ─── Sync: Poll remote status updates ────────────────────────

export async function syncRemoteStatuses(connector: Open311Connector): Promise<{
  updated: number;
  errors: number;
}> {
  const records = await getAllIntegrationRecords();
  const db = await getIntegrationDB();
  let updated = 0;
  let errors = 0;

  for (const record of records) {
    try {
      // Resolve token to request ID if needed
      if (!record.serviceRequestId && record.token) {
        const resolved = await connector.getRequestIdFromToken(record.token);
        if (resolved) {
          record.serviceRequestId = resolved;
        } else {
          continue; // not ready yet
        }
      }

      if (!record.serviceRequestId) continue;

      const remote = await connector.getRequest(record.serviceRequestId);
      if (!remote) continue;

      const newStatus = remote.status;
      if (newStatus !== record.remoteStatus) {
        record.remoteStatus = newStatus;
        record.rawPayload = remote;
        record.lastPolledAt = new Date().toISOString();
        await db.put('records', record);
        updated++;
      } else {
        record.lastPolledAt = new Date().toISOString();
        await db.put('records', record);
      }
    } catch {
      errors++;
    }
  }

  return { updated, errors };
}

// ─── Default Connector Instance ──────────────────────────────

const DEFAULT_CONFIG: Open311JurisdictionConfig = {
  jurisdictionId: 'jur-001',
  jurisdictionName: 'New York City (Demo)',
  discoveryUrl: 'https://api.civiclens.app/open311/discovery',
  baseUrl: 'https://api.civiclens.app/open311/v2',
  apiKey: null,
  format: 'json',
  isActive: true,
};

export const defaultConnector = new Open311Connector(DEFAULT_CONFIG);
export const defaultConfig = DEFAULT_CONFIG;

// ─── High-level "submit issue to Open311" helper ─────────────

export async function submitIssueToOpen311(issue: {
  id: string;
  categoryId: string;
  lat: number;
  lng: number;
  description: string;
  address?: string;
}): Promise<{ success: boolean; requestId?: string; token?: string; error?: string }> {
  const serviceCode = categoryToServiceCode(issue.categoryId);

  try {
    const response = await defaultConnector.createRequest({
      service_code: serviceCode,
      lat: issue.lat,
      long: issue.lng,
      description: issue.description,
      address_string: issue.address,
    });

    await storeIntegrationRecord({
      issueId: issue.id,
      jurisdictionId: 'jur-001',
      serviceRequestId: response.service_request_id ?? null,
      token: response.token ?? null,
      remoteStatus: 'open',
      lastPolledAt: new Date().toISOString(),
      rawPayload: null,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      requestId: response.service_request_id ?? undefined,
      token: response.token ?? undefined,
    };
  } catch (err) {
    // Queue for later if offline
    await queueForSubmission({
      issueId: issue.id,
      serviceCode,
      lat: issue.lat,
      lng: issue.lng,
      description: issue.description,
      address: issue.address ?? '',
    });

    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to submit',
    };
  }
}
