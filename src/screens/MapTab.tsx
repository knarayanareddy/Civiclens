import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Filter, List, X, MapPinned, Navigation, Plus, Search } from 'lucide-react';
import { StatusChip, FilterChip, IssueCard, BottomSheet, PhotoPlaceholder } from '../components/ui';
import { issues, categories, defaultFilters, getCategoryById, getUserLocation, getTimeAgo } from '../data/mockData';
import type { MapFilters, Issue, IssueStatus } from '../types';

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#3B82F6', ACKNOWLEDGED: '#F59E0B', IN_PROGRESS: '#F97316',
  CLOSED: '#22C55E', REJECTED: '#EF4444', MERGED: '#6B7280',
};

function issueIcon(status: string, emoji: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${STATUS_COLORS[status] || '#94A3B8'};width:34px;height:34px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">${emoji}</div>`,
    iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -22],
  });
}

function userDotIcon(): L.DivIcon {
  return L.divIcon({
    className: 'user-location-marker',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.2),0 2px 6px rgba(0,0,0,0.2);"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9],
  });
}

function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  const prevCenter = useRef<string>('');
  useEffect(() => {
    if (!center) return;
    const key = `${center[0]},${center[1]}`;
    if (key !== prevCenter.current) {
      map.flyTo(center, 15, { duration: 1.2 });
      prevCenter.current = key;
    }
  }, [center, map]);
  return null;
}

function PopupContent({ issue, onViewDetails, onFollow }: {
  issue: Issue; onViewDetails: () => void; onFollow: () => void;
}) {
  const cat = getCategoryById(issue.categoryId);
  return (
    <div className="p-3 min-w-[260px]">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{cat?.emoji}</span>
        <h3 className="font-semibold text-sm text-slate-900 truncate flex-1">{issue.title}</h3>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <StatusChip status={issue.status} />
        <span className="text-[10px] text-slate-400">{issue.distance} mi · {getTimeAgo(issue.createdAt)}</span>
      </div>
      {issue.isUnsafeNow && (
        <span className="inline-flex items-center gap-1 text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full mb-2">⚠️ Unsafe</span>
      )}
      <div className="flex gap-2">
        <button onClick={onViewDetails} className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-semibold active:opacity-80">View details</button>
        <button onClick={onFollow} className="flex-1 py-2 bg-primary-50 text-primary rounded-lg text-xs font-semibold border border-primary-100 active:bg-primary-100">+ Follow</button>
      </div>
    </div>
  );
}

function FiltersSheet({ filters, onApply, onClose }: {
  filters: MapFilters; onApply: (f: MapFilters) => void; onClose: () => void;
}) {
  const [local, setLocal] = useState<MapFilters>(filters);
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-sm text-slate-700 mb-2">Status</h3>
        <div className="flex flex-wrap gap-2">
          {(['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'CLOSED', 'REJECTED'] as IssueStatus[]).map(s => (
            <FilterChip key={s} label={s.replace('_', ' ')} selected={local.statuses.includes(s)}
              onTap={() => setLocal(p => ({ ...p, statuses: p.statuses.includes(s) ? p.statuses.filter(x => x !== s) : [...p.statuses, s] }))} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-sm text-slate-700 mb-2">Category</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <FilterChip key={c.id} label={`${c.emoji} ${c.name}`} selected={local.categories.includes(c.id)}
              onTap={() => setLocal(p => ({ ...p, categories: p.categories.includes(c.id) ? p.categories.filter(x => x !== c.id) : [...p.categories, c.id] }))} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-sm text-slate-700 mb-2">Sort by</h3>
        <div className="flex gap-2">
          {(['nearest', 'newest', 'most_followed'] as const).map(s => (
            <FilterChip key={s} label={s.replace('_', ' ')} selected={local.sort === s}
              onTap={() => setLocal(p => ({ ...p, sort: s }))} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Show only followed</span>
        <button onClick={() => setLocal(p => ({ ...p, showOnlyFollowed: !p.showOnlyFollowed }))}
          className={`toggle-track ${local.showOnlyFollowed ? 'active' : ''}`}
          role="switch" aria-checked={local.showOnlyFollowed} aria-label="Show only followed">
          <div className="toggle-thumb" />
        </button>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={() => onApply(defaultFilters)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm">Reset</button>
        <button onClick={() => { onApply(local); onClose(); }} className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm">Apply</button>
      </div>
    </div>
  );
}

export function MapScreen({ onOpenIssue, onReport, followedIssues = new Set<string>() }: {
  onOpenIssue: (id: string) => void; onReport: () => void; followedIssues?: Set<string>;
}) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [recenterTarget, setRecenterTarget] = useState<[number, number] | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MapFilters>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getUserLocation().then(loc => {
      setUserLocation([loc.lat, loc.lng]);
      setRecenterTarget([loc.lat, loc.lng]);
    });
  }, []);

  const filteredIssues = useMemo(() => issues.filter(i => {
    if (filters.statuses.length && !filters.statuses.includes(i.status)) return false;
    if (filters.categories.length && !filters.categories.includes(i.categoryId)) return false;
    if (filters.showOnlyFollowed && !followedIssues.has(i.id)) return false;
    if (searchQuery && !i.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }), [filters, searchQuery, followedIssues]);

  const defaultCenter: [number, number] = [40.758, -73.9855];

  return (
    <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
      {/* Top bar overlay */}
      <div className="absolute top-0 left-0 right-0 z-[1000] px-3 pt-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-slate-200/60 px-3 py-2.5">
            <MapPinned size={18} className="text-slate-400 mr-2 flex-shrink-0" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search this area..."
              className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-slate-400" aria-label="Search" />
            {searchQuery && <button onClick={() => setSearchQuery('')} aria-label="Clear"><X size={16} className="text-slate-400" /></button>}
          </div>
          <button onClick={() => setShowFilters(true)}
            className={`w-10 h-10 rounded-xl shadow-sm flex items-center justify-center border active:scale-95 transition-all ${
              filters.statuses.length > 0 || filters.categories.length > 0 ? 'bg-primary text-white border-primary' : 'bg-white/90 backdrop-blur-md text-slate-600 border-slate-200/60'}`}
            aria-label="Filters">
            <Filter size={18} />
          </button>
          <button onClick={() => setView(v => v === 'map' ? 'list' : 'map')}
            className="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md shadow-sm flex items-center justify-center border border-slate-200/60 text-slate-600 active:scale-95"
            aria-label={view === 'map' ? 'List view' : 'Map view'}>
            {view === 'map' ? <List size={18} /> : <MapPinned size={18} />}
          </button>
        </div>
        {filteredIssues.length > 0 && view === 'map' && (
          <span className="mt-2 inline-block text-[10px] text-slate-500 font-medium bg-white/80 px-2 py-1 rounded-full">{filteredIssues.length} issues nearby</span>
        )}
      </div>

      {view === 'map' ? (
        <div className="flex-1 relative">
          <MapContainer center={defaultCenter} zoom={15} zoomControl={true} className="w-full h-full" style={{ minHeight: '300px' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={recenterTarget} />
            {userLocation && (
              <Marker position={userLocation} icon={userDotIcon()} />
            )}
            {filteredIssues.map(issue => {
              const cat = getCategoryById(issue.categoryId);
              return (
                <Marker key={issue.id} position={[issue.lat, issue.lng]} icon={issueIcon(issue.status, cat?.emoji || '📍')}>
                  <Popup maxWidth={300} minWidth={260} closeButton={false}>
                    <PopupContent issue={issue}
                      onViewDetails={() => onOpenIssue(issue.id)}
                      onFollow={() => {}} />
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
          {/* Recenter button */}
          {userLocation && (
            <button onClick={() => setRecenterTarget([...userLocation])}
              className="absolute right-3 bottom-4 z-[1000] w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center text-blue-500 active:bg-slate-50"
              aria-label="Center on my location">
              <Navigation size={20} />
            </button>
          )}
          {/* Report hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-black/60 backdrop-blur-sm text-white text-[10px] px-3 py-1.5 rounded-full">
            Tap a pin to view · Press Report to add
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pt-20 no-scrollbar">
          <div className="px-4 space-y-3 pb-4">
            {filteredIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MapPin size={36} className="text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-600">No issues here</h3>
                <p className="text-sm text-slate-400 mt-1">Be the first to report one</p>
                <button onClick={onReport} className="mt-4 px-5 py-2.5 bg-primary text-white rounded-xl font-medium text-sm">Report an issue</button>
              </div>
            ) : (
              filteredIssues.map(issue => (
                <IssueCard key={issue.id} issue={issue} onTap={() => onOpenIssue(issue.id)} />
              ))
            )}
          </div>
        </div>
      )}

      <BottomSheet isOpen={showFilters} onClose={() => setShowFilters(false)} title="Filter issues">
        <FiltersSheet filters={filters} onApply={setFilters} onClose={() => setShowFilters(false)} />
      </BottomSheet>
    </div>
  );
}
