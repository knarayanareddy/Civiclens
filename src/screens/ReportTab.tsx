import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, RotateCcw, MapPin, ChevronRight, AlertTriangle,
  Eye, EyeOff, CheckCircle2, ArrowRight, Share2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { CategoryChip, SeveritySlider, IssueCard } from '../components/ui';
import { categories, duplicateCandidates, getCategoryById, reverseGeocode } from '../data/mockData';
import type { ReportDraft, PrivacyMode } from '../types';

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#0F766E;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>`,
    iconSize: [28, 28], iconAnchor: [14, 28],
  });
}

// ─── Camera Capture (REAL CAMERA) ────────────────────────
export function ReportCamera({ onCapture, onCancel }: {
  onCapture: (photo: string) => void; onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'active' | 'denied'>('loading');
  const [facingFront, setFacingFront] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Start/stop camera whenever `captured` or `facingFront` changes
  useEffect(() => {
    if (captured) return; // Don't start camera while previewing
    let cancelled = false;
    const startCamera = async () => {
      setCameraStatus('loading');
      try {
        streamRef.current?.getTracks().forEach(t => t.stop());
        if (!navigator.mediaDevices?.getUserMedia) { if (!cancelled) setCameraStatus('denied'); return; }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingFront ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          if (!cancelled) setCameraStatus('active');
        }
      } catch { if (!cancelled) setCameraStatus('denied'); }
    };
    startCamera();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [captured, facingFront]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.drawImage(video, 0, 0); }
    const url = canvas.toDataURL('image/jpeg', 0.85);
    setCaptured(url);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const handleRetake = useCallback(() => { setCaptured(null); }, []);

  const handleGallerySelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') setCaptured(reader.result); };
    reader.readAsDataURL(file);
  }, []);

  // Photo captured — show preview
  if (captured) {
    return (
      <div className="flex-1 flex flex-col bg-black animate-fade-in">
        <div className="flex-1 relative">
          <img src={captured} alt="Captured" className="w-full h-full object-cover" />
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
            <button onClick={handleRetake} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center" aria-label="Retake">
              <RotateCcw size={20} className="text-white" />
            </button>
            <span className="text-white font-semibold text-sm bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">Preview</span>
            <div className="w-10" />
          </div>
        </div>
        <div className="p-6 bg-black">
          <button onClick={() => onCapture(captured)}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
            Use this photo <CheckCircle2 size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Camera denied — show fallback
  if (cameraStatus === 'denied') {
    return (
      <div className="flex-1 flex flex-col bg-white animate-fade-in">
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <button onClick={onCancel} className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center" aria-label="Cancel">
            <X size={22} className="text-slate-700" />
          </button>
          <h1 className="font-bold text-lg text-slate-900 flex-1 text-center">Camera</h1>
          <div className="w-9" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
            <Camera size={28} className="text-amber-500" />
          </div>
          <h2 className="font-bold text-lg text-slate-700">Camera unavailable</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">
            Camera access was denied or is unavailable. You can continue without a photo.
          </p>
          <button onClick={() => onCapture('')}
            className="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform">
            Continue without photo
          </button>
          <button onClick={onCancel} className="mt-3 text-sm text-slate-500">Cancel</button>
        </div>
      </div>
    );
  }

  // Camera viewfinder
  return (
    <div className="flex-1 flex flex-col bg-black">
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
        {cameraStatus === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
              <span className="text-white/60 text-sm">Starting camera…</span>
            </div>
          </div>
        )}
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/10" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/10" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/10" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/10" />
        </div>
        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
          <button onClick={onCancel} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center" aria-label="Cancel">
            <X size={20} className="text-white" />
          </button>
          <span className="text-white font-semibold text-sm bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">Report</span>
          <button onClick={() => setFacingFront(!facingFront)}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
            aria-label="Switch camera">
            <RotateCcw size={20} className="text-white/60" />
          </button>
        </div>
      </div>
      {/* Capture button row */}
      <div className="bg-black/90 p-6 flex items-center justify-center gap-8">
        <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center" aria-label="Import from gallery">
          <Camera size={20} className="text-white/60" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleGallerySelect} className="hidden" aria-hidden="true" />
        <button onClick={handleCapture} disabled={cameraStatus !== 'active'}
          className="rounded-full bg-white border-4 border-slate-300 active:scale-90 transition-transform flex items-center justify-center disabled:opacity-50"
          style={{ width: 72, height: 72 }} aria-label="Take photo">
          <div className="w-14 h-14 rounded-full bg-white" />
        </button>
        <button onClick={() => setFacingFront(f => !f)} className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center" aria-label="Switch camera">
          <RotateCcw size={20} className="text-white/60" />
        </button>
      </div>
    </div>
  );
}

// ─── Location Pin (REAL GPS + LEAFLET MAP) ───────────────
export function ReportLocation({ draft, onUpdate, onContinue, onBack, userLocation }: {
  draft: ReportDraft; onUpdate: (d: Partial<ReportDraft>) => void;
  onContinue: () => void; onBack: () => void; userLocation?: { lat: number; lng: number };
}) {
  const [pinPos, setPinPos] = useState<[number, number]>([draft.lat, draft.lng]);
  const [address, setAddress] = useState(draft.address || 'Loading address…');
  const [privacy, setPrivacy] = useState<PrivacyMode>(draft.privacyMode);

  useEffect(() => {
    reverseGeocode(draft.lat, draft.lng).then(addr => {
      setAddress(addr);
      onUpdate({ address: addr });
    });
  }, []);

  const handlePositionChange = (lat: number, lng: number) => {
    setPinPos([lat, lng]);
    onUpdate({ lat, lng });
    setAddress('Loading…');
    reverseGeocode(lat, lng).then(addr => {
      setAddress(addr);
      onUpdate({ address: addr });
    });
  };

  const handleUseCurrentLocation = () => {
    if (userLocation) {
      handlePositionChange(userLocation.lat, userLocation.lng);
    }
  };

  function LocationMarker() {
    useMapEvents({
      click(e) { handlePositionChange(e.latlng.lat, e.latlng.lng); },
    });
    return (
      <Marker position={pinPos} icon={pinIcon()} draggable={true}
        eventHandlers={{
          dragend: (e: L.DragEndEvent) => {
            const marker = e.target as L.Marker;
            const pos = marker.getLatLng();
            handlePositionChange(pos.lat, pos.lng);
          },
        }}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white animate-fade-in">
      <div className="flex items-center px-4 py-3 border-b border-slate-100">
        <button onClick={onBack} className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center" aria-label="Back">
          <X size={22} className="text-slate-700" />
        </button>
        <h1 className="font-bold text-lg text-slate-900 flex-1 text-center">Confirm location</h1>
        <div className="w-9" />
      </div>

      {/* Leaflet mini map */}
      <div className="h-64 relative">
        <MapContainer center={pinPos} zoom={17} zoomControl={false} className="w-full h-full" style={{ minHeight: '200px' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap' />
          <LocationMarker />
        </MapContainer>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
          Tap or drag to adjust pin
        </div>
      </div>

      <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
          <MapPin size={18} className="text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{address}</p>
            <p className="text-xs text-slate-400 mt-0.5">{pinPos[0].toFixed(5)}, {pinPos[1].toFixed(5)}</p>
          </div>
        </div>

        <button onClick={handleUseCurrentLocation}
          className="w-full py-2.5 text-primary text-sm font-semibold bg-primary-50 rounded-xl border border-primary-100 active:bg-primary-100">
          📍 Use my current location
        </button>

        <div>
          <h3 className="font-semibold text-sm text-slate-700 mb-2">Location privacy</h3>
          <div className="space-y-2">
            {[
              { value: 'exact' as PrivacyMode, label: 'Exact location', desc: 'Pin shows exactly where the issue is', Icon: Eye },
              { value: 'approximate' as PrivacyMode, label: 'Approximate', desc: 'Block-level accuracy for sensitive reports', Icon: EyeOff },
            ].map(opt => (
              <button key={opt.value} onClick={() => { setPrivacy(opt.value); onUpdate({ privacyMode: opt.value }); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${privacy === opt.value ? 'border-primary bg-primary-50' : 'border-slate-100'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${privacy === opt.value ? 'bg-primary' : 'bg-slate-100'}`}>
                  <opt.Icon size={16} className={privacy === opt.value ? 'text-white' : 'text-slate-500'} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${privacy === opt.value ? 'text-primary' : 'text-slate-700'}`}>{opt.label}</p>
                  <p className="text-[10px] text-slate-400">{opt.desc}</p>
                </div>
                {privacy === opt.value && <CheckCircle2 size={18} className="text-primary ml-auto" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-slate-100">
        <button onClick={onContinue}
          className="w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
          Continue <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── Category Selection ──────────────────────────────────
export function ReportCategory({ draft, onUpdate, onContinue, onBack }: {
  draft: ReportDraft; onUpdate: (d: Partial<ReportDraft>) => void; onContinue: () => void; onBack: () => void;
}) {
  const [selected, setSelected] = useState(draft.categoryId);
  return (
    <div className="flex-1 flex flex-col bg-white animate-fade-in">
      <div className="flex items-center px-4 py-3 border-b border-slate-100">
        <button onClick={onBack} className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center" aria-label="Back">
          <ChevronRight size={22} className="text-slate-700 rotate-180" />
        </button>
        <h1 className="font-bold text-lg text-slate-900 flex-1 text-center">What type of issue?</h1>
        <div className="w-9" />
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 no-scrollbar">
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggested</h3>
          <div className="space-y-2">
            {categories.slice(0, 3).map(c => (
              <CategoryChip key={c.id} category={c} selected={selected === c.id}
                onTap={() => { setSelected(c.id); onUpdate({ categoryId: c.id }); }} suggested />
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">All categories</h3>
          <div className="space-y-2">
            {categories.map(c => (
              <CategoryChip key={c.id} category={c} selected={selected === c.id}
                onTap={() => { setSelected(c.id); onUpdate({ categoryId: c.id }); }} />
            ))}
          </div>
        </div>
      </div>
      <div className="p-5 border-t border-slate-100">
        <button onClick={onContinue} disabled={!selected}
          className="w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform">
          Continue <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── Details ─────────────────────────────────────────────
export function ReportDetails({ draft, onUpdate, onContinue, onBack }: {
  draft: ReportDraft; onUpdate: (d: Partial<ReportDraft>) => void; onContinue: () => void; onBack: () => void;
}) {
  const [severity, setSeverity] = useState(draft.severity);
  const [unsafeNow, setUnsafeNow] = useState(draft.isUnsafeNow);
  const [note, setNote] = useState(draft.note);
  const [anonymous, setAnonymous] = useState(draft.isAnonymous);

  return (
    <div className="flex-1 flex flex-col bg-white animate-fade-in">
      <div className="flex items-center px-4 py-3 border-b border-slate-100">
        <button onClick={onBack} className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center" aria-label="Back">
          <ChevronRight size={22} className="text-slate-700 rotate-180" />
        </button>
        <h1 className="font-bold text-lg text-slate-900 flex-1 text-center">Add details</h1>
        <div className="w-9" />
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 no-scrollbar">
        <div>
          <h3 className="font-semibold text-sm text-slate-700 mb-3">How severe is it?</h3>
          <SeveritySlider value={severity} onChange={v => { setSeverity(v); onUpdate({ severity: v }); }} />
        </div>
        <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50 border border-red-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><AlertTriangle size={20} className="text-red-600" /></div>
            <div>
              <p className="font-semibold text-sm text-red-900">Unsafe right now?</p>
              <p className="text-[10px] text-red-700/60">Flags this as needing urgent attention</p>
            </div>
          </div>
          <button onClick={() => { setUnsafeNow(!unsafeNow); onUpdate({ isUnsafeNow: !unsafeNow }); }}
            className={`toggle-track ${unsafeNow ? 'active' : '!bg-red-200'}`} role="switch" aria-checked={unsafeNow} aria-label="Unsafe now">
            <div className="toggle-thumb" />
          </button>
        </div>
        <div>
          <h3 className="font-semibold text-sm text-slate-700 mb-2">What's happening?</h3>
          <textarea value={note} onChange={e => { setNote(e.target.value); onUpdate({ note: e.target.value }); }}
            placeholder="Describe the issue (optional)" maxLength={500}
            className="w-full h-28 px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          <p className="text-[10px] text-slate-400 mt-1 text-right">{note.length}/500</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EyeOff size={18} className="text-slate-400" />
            <div><p className="font-medium text-sm text-slate-700">Report anonymously</p><p className="text-[10px] text-slate-400">Your name won't be shown publicly</p></div>
          </div>
          <button onClick={() => { setAnonymous(!anonymous); onUpdate({ isAnonymous: !anonymous }); }}
            className={`toggle-track ${anonymous ? 'active' : ''}`} role="switch" aria-checked={anonymous} aria-label="Anonymous">
            <div className="toggle-thumb" />
          </button>
        </div>
      </div>
      <div className="p-5 border-t border-slate-100">
        <button onClick={onContinue} className="w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
          Continue <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── Duplicate Check ─────────────────────────────────────
export function ReportDuplicates({ onFollowExisting, onProceed }: {
  onFollowExisting: (issueId: string) => void; onProceed: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col bg-white animate-fade-in">
      <div className="flex items-center px-4 py-3 border-b border-slate-100">
        <div className="w-9" /><h1 className="font-bold text-lg text-slate-900 flex-1 text-center">Possible matches</h1><div className="w-9" />
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar">
        <p className="text-sm text-slate-500 mb-4">We found similar issues nearby. Is it one of these?</p>
        <div className="space-y-3">
          {duplicateCandidates.map(issue => (
            <div key={issue.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <IssueCard issue={issue} onTap={() => {}} />
              <div className="border-t border-slate-100 px-4 py-3">
                <button onClick={() => onFollowExisting(issue.id)}
                  className="w-full py-2.5 bg-primary-50 text-primary rounded-xl font-semibold text-sm active:bg-primary-100">
                  This is it — Follow instead
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <button onClick={onProceed} className="w-full py-3 text-slate-500 font-medium text-sm">None of these — proceed with my report</button>
        </div>
      </div>
    </div>
  );
}

// ─── Review & Submit ─────────────────────────────────────
export function ReportReview({ draft, onSubmit, onBack, onEditStep }: {
  draft: ReportDraft; onSubmit: () => void; onBack: () => void; onEditStep: (step: number) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const cat = draft.categoryId ? getCategoryById(draft.categoryId) : null;

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); onSubmit(); }, 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-white animate-fade-in">
      <div className="flex items-center px-4 py-3 border-b border-slate-100">
        <button onClick={onBack} className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center" aria-label="Back">
          <ChevronRight size={22} className="text-slate-700 rotate-180" />
        </button>
        <h1 className="font-bold text-lg text-slate-900 flex-1 text-center">Review report</h1>
        <div className="w-9" />
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {draft.photo ? (
            <img src={draft.photo} alt="Report photo" className="w-full h-40 object-cover" />
          ) : (
            <div className="w-full h-40 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
              <Camera size={36} className="text-white/50" />
            </div>
          )}
          <div className="p-4 space-y-3">
            {[
              { label: 'Category', value: `${cat?.emoji || ''} ${cat?.name || 'None'}` },
              { label: 'Location', value: draft.address || `${draft.lat.toFixed(4)}, ${draft.lng.toFixed(4)}` },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{r.label}</span>
                <span className="font-medium text-sm text-slate-700 truncate ml-2 max-w-[200px]">{r.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Severity</span>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(n => <div key={n} className={`w-3 h-3 rounded-full ${n <= draft.severity ? 'bg-primary' : 'bg-slate-200'}`} />)}
                <span className="text-sm font-medium text-slate-700 ml-1">{draft.severity}/5</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Privacy</span>
              <span className="font-medium text-sm text-slate-700 capitalize">{draft.privacyMode}</span>
            </div>
            {draft.note && (
              <div>
                <span className="text-xs text-slate-400">Note</span>
                <p className="text-sm text-slate-700 mt-1 bg-slate-50 rounded-lg p-2.5">{draft.note}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              {draft.isUnsafeNow && <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full"><AlertTriangle size={12} />Unsafe</span>}
              {draft.isAnonymous && <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full"><EyeOff size={12} />Anonymous</span>}
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-4">
          {[{ label: 'Photo', step: 1 }, { label: 'Location', step: 2 }, { label: 'Category', step: 3 }, { label: 'Details', step: 4 }].map(e => (
            <button key={e.label} onClick={() => onEditStep(e.step)} className="text-xs text-primary font-medium underline underline-offset-2 active:text-primary-dark">Edit {e.label}</button>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">Do not report emergencies here. Call 911 for immediate threats to life or safety.</p>
        </div>
      </div>
      <div className="p-5 border-t border-slate-100">
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.97] transition-transform">
          {submitting ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting…</> : <>Submit report <ArrowRight size={18} /></>}
        </button>
      </div>
    </div>
  );
}

// ─── Success ─────────────────────────────────────────────
export function ReportSuccess({ onViewIssue, onClose }: { onViewIssue: () => void; onClose: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 animate-fade-in">
      <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-6 animate-scale-in">
        <CheckCircle2 size={48} className="text-green-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 text-center">Report submitted!</h1>
      <p className="text-slate-500 text-sm mt-2 text-center">Your issue has been reported. You'll be notified when the status changes.</p>
      <div className="mt-8 w-full space-y-3">
        <button onClick={onViewIssue} className="w-full py-3.5 bg-primary text-white rounded-2xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
          View issue <ArrowRight size={18} />
        </button>
        <button onClick={onClose} className="w-full py-3.5 bg-slate-50 text-slate-700 rounded-2xl font-medium text-base border border-slate-200">Back to map</button>
        <button onClick={() => {
          const text = 'I just reported a civic issue on CivicLens! Help get it fixed.';
          const url = window.location.href;
          if (navigator.share) { navigator.share({ title: 'CivicLens Issue', text, url }).catch(() => {}); }
          else { navigator.clipboard?.writeText(`${text}\n${url}`).catch(() => {}); }
        }}
          className="w-full py-3 text-primary font-medium text-sm flex items-center justify-center gap-2 active:underline">
          <Share2 size={16} /> Share this issue
        </button>
      </div>
    </div>
  );
}
