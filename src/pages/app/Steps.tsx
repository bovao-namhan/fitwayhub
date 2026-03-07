import { getApiBase } from "@/lib/api";
import React, { useState, useEffect, useRef } from 'react';
import { Activity, TrendingUp, Calendar, Plus, Trash2, Zap, MapPin, Keyboard, Play, Square, AlertCircle, Loader, Wifi, WifiOff } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import { useAuth, isTrialOrPremium, trialDaysLeft } from '@/context/AuthContext';
import axios from 'axios';
import { calculateStepsFromDistance, calculateDistanceFromSteps, estimateCaloriesBurned, calculateCaloriesMET, UserMetrics, ActivityMode, normaliseHeightCm } from '@/lib/stepCalculations';
// old location-tracking helpers are no longer required; MapTracker
// now performs geolocation, distance/step estimation, and polyline
// rendering. we keep the import commented out for reference.
// // Google Fit removed — using device geolocation + OpenStreetMap for live tracking
import MapTracker from '@/components/app/MapTracker';

interface StepsEntry {
  id: number;
  date: string;
  steps: number;
  calories_burned?: number;
  distance_km?: number;
  notes?: string;
  tracking_mode?: 'manual' | 'live' | 'live-premium';
  created_at: string;
}

interface WeeklyStats {
  totalSteps: number;
  avgSteps: number;
  maxSteps: number;
  totalCalories: number;
  daysTracked: number;
  entries: StepsEntry[];
}

export default function Steps() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const [activeTab, setActiveTab] = useState<'today' | 'weekly' | 'monthly'>('today');
  const [trackingMode, setTrackingMode] = useState<'manual' | 'live'>('manual');
  const [entries, setEntries] = useState<StepsEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<WeeklyStats | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Manual mode
  const [steps, setSteps] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [manualMode, setManualMode] = useState<ActivityMode>('walking');
  
  // Live tracking values (updated via MapTracker's onUpdate)
  const [autoDistance, setAutoDistance] = useState(0);
  const [autoSteps, setAutoSteps] = useState(0);
  const [autoSpeed, setAutoSpeed] = useState<number | null>(null);
  const [autoMet, setAutoMet] = useState<number | null>(null);
  const [trackedDuration, setTrackedDuration] = useState(0);
  
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Distance unit preference
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'm' | 'cm'>(() => {
    const saved = localStorage.getItem('fithub_distance_unit');
    return (saved as 'km' | 'm' | 'cm') || 'km';
  });

  // Convert internal distance (meters) to display value based on selected unit
  const getDisplayDistance = (distanceMeters: number): { value: number; unit: string } => {
    switch (distanceUnit) {
      case 'm':
        return { value: distanceMeters, unit: 'm' };
      case 'cm':
        return { value: Math.round(distanceMeters * 100), unit: 'cm' };
      case 'km':
      default:
        return { value: distanceMeters / 1000, unit: 'km' };
    }
  };

  const handleDistanceUnitChange = (unit: 'km' | 'm' | 'cm') => {
    setDistanceUnit(unit);
    localStorage.setItem('fithub_distance_unit', unit);
  };

  // Offline tracking
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    fetchData();
    
    // Check offline steps on mount
    const offlineSteps = JSON.parse(localStorage.getItem('offline_steps') || '[]');
    setOfflineCount(offlineSteps.length);
    
    // Set up online/offline listeners
    const handleOnline = async () => {
      setIsOnline(true);
      setMessage(t('back_online_sync'));
      await syncOfflineSteps();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setMessage(t('offline_saved'));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const historyRes = await axios.get(getApiBase() + '/api/steps/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntries(historyRes.data.entries);

      const weekRes = await axios.get(getApiBase() + '/api/steps/stats/weekly', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWeeklyStats(weekRes.data.weeklyStats);

      const monthRes = await axios.get(getApiBase() + '/api/steps/stats/monthly', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMonthlyStats(monthRes.data.monthlyStats);

      const todayRes = await axios.get(`/api/steps/${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (todayRes.data.entry) {
        setSteps(todayRes.data.entry.steps.toString());
        setDistanceKm(todayRes.data.entry.distance_km?.toString() || '');
        setCalories(todayRes.data.entry.calories_burned?.toString() || '');
        setNotes(todayRes.data.entry.notes || '');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manual mode: calculate steps from distance or vice versa
  const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const distance = parseFloat(e.target.value) || 0;
    setDistanceKm(e.target.value);
    
    if (distance > 0) {
      const userMetrics: UserMetrics = {
        height: normaliseHeightCm(user?.height),
        weight: user?.weight || 70,
        gender: (user?.gender as 'male' | 'female' | 'other') || 'other'
      };
      const calculatedSteps = calculateStepsFromDistance(distance, userMetrics, manualMode);
      setSteps(calculatedSteps.toString());
      
      const met = calculateCaloriesMET({ weightKg: userMetrics.weight, heightCm: userMetrics.height, distanceKm: distance, gender: userMetrics.gender, mode: manualMode });
      setCalories(met.calories.toString());
    }
  };

  const handleStepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const stepsValue = parseInt(e.target.value) || 0;
    setSteps(e.target.value);
    
    if (stepsValue > 0) {
      const userMetrics: UserMetrics = {
        height: normaliseHeightCm(user?.height),
        weight: user?.weight || 70,
        gender: (user?.gender as 'male' | 'female' | 'other') || 'other'
      };
      const calculatedDistance = calculateDistanceFromSteps(stepsValue, userMetrics, manualMode);
      setDistanceKm(calculatedDistance.toString());
      
      const met = calculateCaloriesMET({ weightKg: userMetrics.weight, heightCm: userMetrics.height, distanceKm: calculatedDistance, gender: userMetrics.gender, mode: manualMode });
      setCalories(met.calories.toString());
    }
  };

  // tracker state – values updated via MapTracker onUpdate callback
  const mapTrackerRef = useRef<any>(null);
  const [countMode, setCountMode] = useState<'perMeter' | 'stride'>(() => (localStorage.getItem('fithub_count_mode') as 'perMeter' | 'stride') || 'perMeter');

  // Helper: provide user metrics or sensible defaults for live estimation
  const getUserMetricsOrDefaults = (): UserMetrics => {
    return {
      height: normaliseHeightCm(user?.height),
      weight: user?.weight || 70,
      gender: (user?.gender as 'male' | 'female' | 'other') || 'other'
    };
  };

  // live tracking updates come via MapTracker's onUpdate callback
  const handleMapUpdate = (data: { distanceMeters: number; steps: number; calories: number; speedKmh?: number; met?: number }) => {
    setAutoDistance(data.distanceMeters);
    setAutoSteps(data.steps);
    setCalories(data.calories.toString());
    setAutoSpeed(typeof data.speedKmh === 'number' ? data.speedKmh : null);
    setAutoMet(typeof data.met === 'number' ? data.met : null);
  };


  const saveOfflineSteps = (data: any) => {
    const offlineSteps: any[] = JSON.parse(localStorage.getItem('offline_steps') || '[]');
    // Merge with existing entry for same date — use highest step count
    const existingIdx = offlineSteps.findIndex(e => e.date === data.date);
    if (existingIdx >= 0) {
      const existing = offlineSteps[existingIdx];
      offlineSteps[existingIdx] = {
        ...existing,
        steps: Math.max(existing.steps || 0, data.steps || 0),
        caloriesBurned: Math.max(existing.caloriesBurned || 0, data.caloriesBurned || 0),
        distanceKm: Math.max(existing.distanceKm || 0, data.distanceKm || 0),
        timestamp: new Date().toISOString(),
      };
    } else {
      offlineSteps.push({ ...data, timestamp: new Date().toISOString() });
    }
    localStorage.setItem('offline_steps', JSON.stringify(offlineSteps));
    setOfflineCount(offlineSteps.length);
  };

  const syncOfflineSteps = async () => {
    const offlineSteps = JSON.parse(localStorage.getItem('offline_steps') || '[]');
    if (offlineSteps.length === 0) return;
    
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      // Send entire batch in one request; server does upsert-merge per date
      const batch = offlineSteps.map(({ timestamp, ...rest }: any) => rest);
      const res = await axios.post(getApiBase() + '/api/auth/offline-steps', batch, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { synced } = res.data;
      localStorage.removeItem('offline_steps');
      setOfflineCount(0);
      setMessage(`✅ Synced ${synced} offline entr${synced === 1 ? 'y' : 'ies'}!`);
      setTimeout(() => setMessage(''), 3000);
      fetchData();
    } catch (error) {
      console.error('Failed to sync offline steps:', error);
      setMessage('⚠️ Sync failed — will retry when connection is stable.');
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setIsSyncing(false);
    }
  };


  const handleAddSteps = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!steps || parseInt(steps) < 0) {
      setMessage('Please enter valid steps');
      return;
    }

    const stepData = {
      date: selectedDate,
      steps: parseInt(steps),
      caloriesBurned: calories ? parseInt(calories) : undefined,
      distanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
      trackingMode: trackingMode,
      notes: notes || undefined
    };

    try {
      // If offline, save locally
      if (!isOnline) {
        saveOfflineSteps(stepData);
        setMessage('📱 Steps saved locally. Will sync when online.');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const token = localStorage.getItem('token');
        await axios.post(getApiBase() + '/api/steps/add', stepData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('☁️ Steps recorded successfully!');
        setTimeout(() => setMessage(''), 3000);
        // Check if step goal completed and award points
        try {
          const stepGoal = user?.stepGoal || 10000;
          if (parseInt(steps) >= stepGoal) {
            const goalRes = await axios.post(getApiBase() + '/api/steps/goal-completed', {}, { headers: { Authorization: `Bearer ${token}` } });
            if (goalRes.data?.points > 0) {
              setTimeout(() => setMessage('🎉 Goal reached! +2 bonus points awarded!'), 500);
            }
          }
        } catch {}
      }
      
      // Reset live tracking state only (keep steps/distance/calories so Today's Summary shows)
      setAutoDistance(0);
      setAutoSteps(0);
      setTrackedDuration(0);
      setNotes('');
      
      // Refresh data — await so Today's Summary is populated before clearing form state
      await fetchData();
    } catch (error: any) {
      console.error('Error adding steps:', error);
      if (!isOnline) {
        saveOfflineSteps(stepData);
        setMessage('📱 Saved offline (connection issue). Will sync when online.');
      } else {
        setMessage(error.response?.data?.message || 'Error adding steps');
      }
    }
  };

    const handleSaveSession = async (session: any) => {
      try {
        const token = localStorage.getItem('token');
        await axios.post(getApiBase() + '/api/track/sessions', session, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Live tracking session saved.');
        setTimeout(() => setMessage(''), 3000);
        fetchData();
      } catch (err: any) {
        console.error('Failed to save tracking session', err);
        setMessage('Failed to save tracking session.');
      }
    };



  const handleDeleteEntry = async (date: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/steps/${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Entry deleted successfully!');
      setTimeout(() => setMessage(''), 3000);
      fetchData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Error deleting entry');
    }
  };


  const iStyle: React.CSSProperties = { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", width: "100%", fontSize: 14, color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif", outline: "none" };

  return (
    <div style={{ padding: isMobile ? "16px 12px 40px" : "20px 16px 40px", maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 4 }}>Activity Tracker</p>
        <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 700 }}>{t('activity_tracker') || 'Steps & Activity'}</h1>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ marginBottom: 16, padding: "12px 16px", backgroundColor: "rgba(255,179,64,0.1)", border: "1px solid rgba(255,179,64,0.3)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--amber)" }}>
          <WifiOff size={16} /> Offline — {offlineCount > 0 ? `${offlineCount} entries pending sync.` : "Changes saved locally."}
        </div>
      )}
      {offlineCount > 0 && isOnline && (
        <button onClick={syncOfflineSteps} disabled={isSyncing} style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, backgroundColor: "var(--accent-dim)", border: "1px solid rgba(200,255,0,0.25)", color: "var(--accent)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          {isSyncing ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Wifi size={14} />} Sync {offlineCount} offline step(s)
        </button>
      )}
      {message && (
        <div style={{ marginBottom: 16, padding: "12px 16px", backgroundColor: "rgba(200,255,0,0.08)", border: "1px solid rgba(200,255,0,0.2)", borderRadius: 12, fontSize: 13, color: "var(--accent)" }}>
          {message}
        </div>
      )}

      {/* Step Goal Progress Ring */}
      {(() => {
        const stepGoal = (user as any)?.stepGoal || 10000;
        const todaySteps = parseInt(steps) || 0;
        const pct = Math.min(todaySteps / stepGoal, 1);
        const radius = 62;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference * (1 - pct);
        const goalReached = todaySteps >= stepGoal;
        return (
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "center" : "center", gap: 20, marginBottom: 24, padding: isMobile ? "16px" : "20px", backgroundColor: "var(--bg-card)", border: `1px solid ${goalReached ? 'rgba(200,255,0,0.4)' : 'var(--border)'}`, borderRadius: 16 }}>
            <div style={{ position: "relative", width: isMobile ? 120 : 142, height: isMobile ? 120 : 142, flexShrink: 0 }}>
              <svg width={isMobile ? "120" : "142"} height={isMobile ? "120" : "142"} viewBox="0 0 142 142" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="71" cy="71" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle cx="71" cy="71" r={radius} fill="none" stroke={goalReached ? "var(--accent)" : "var(--blue)"} strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, color: goalReached ? "var(--accent)" : "var(--text-primary)", lineHeight: 1 }}>
                  {todaySteps > 0 ? todaySteps.toLocaleString() : "—"}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>/ {stepGoal.toLocaleString()}</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700 }}>
                {goalReached ? "\ud83c\udf89 Goal Reached!" : "Daily Step Goal"}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {todaySteps > 0
                  ? goalReached
                    ? `You crushed it with ${todaySteps.toLocaleString()} steps!`
                    : `${(stepGoal - todaySteps).toLocaleString()} steps to go`
                  : "Start tracking to see your progress"}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: goalReached ? "var(--accent)" : "var(--blue)" }}>
                {Math.round(pct * 100)}%
              </span>
            </div>
          </div>
        );
      })()}

      {/* Weekly stats row */}
      {weeklyStats && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Week Total", value: weeklyStats.totalSteps.toLocaleString(), sub: `${weeklyStats.daysTracked} days`, color: "var(--accent)" },
            { label: "Daily Avg", value: weeklyStats.avgSteps.toLocaleString(), sub: "steps/day", color: "var(--blue)" },
            { label: "Peak Day", value: weeklyStats.maxSteps.toLocaleString(), sub: "highest", color: "var(--cyan)" },
            { label: "Calories", value: weeklyStats.totalCalories.toLocaleString(), sub: "burned", color: "var(--red)" },
          ].map((s) => (
            <div key={s.label} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {/* Record Form */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px" }}>
          <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Record Activity</h2>

          {/* Mode Toggle */}
          <div style={{ display: "flex", gap: 4, backgroundColor: "var(--bg-surface)", padding: 3, borderRadius: 10, marginBottom: 16 }}>
            {(["manual", "live"] as const).map((mode) => (
              <button key={mode} onClick={() => setTrackingMode(mode)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", backgroundColor: trackingMode === mode ? "var(--accent)" : "transparent", color: trackingMode === mode ? "#0A0A0B" : "var(--text-secondary)", fontFamily: trackingMode === mode ? "'Chakra Petch', sans-serif" : "inherit", transition: "all 0.15s", textTransform: "capitalize" }}>
                {mode === "manual" ? <><Keyboard size={12} style={{ display: "inline", marginRight: 5 }} />Manual</> : <><MapPin size={12} style={{ display: "inline", marginRight: 5 }} />Live</>}
              </button>
            ))}
          </div>

          {trackingMode === "manual" ? (
            <form onSubmit={handleAddSteps} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Walking / Running mode toggle for manual entry */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Activity Type</label>
                <div style={{ display: "flex", gap: 4, backgroundColor: "var(--bg-surface)", padding: 3, borderRadius: 9 }}>
                  {(["walking", "running"] as const).map(m => (
                    <button key={m} type="button" onClick={() => setManualMode(m)} style={{ flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", backgroundColor: manualMode === m ? "var(--accent)" : "transparent", color: manualMode === m ? "#0A0A0B" : "var(--text-secondary)", fontFamily: manualMode === m ? "'Chakra Petch', sans-serif" : "inherit", transition: "all 0.15s", textTransform: "capitalize" }}>
                      {m === "walking" ? "\ud83d\udeb6" : "\ud83c\udfc3"} {m}
                    </button>
                  ))}
                </div>
              </div>
              {[
                { label: "Date", type: "date", val: selectedDate, onChange: (e: any) => setSelectedDate(e.target.value) },
                { label: "Distance (km)", type: "number", val: distanceKm, onChange: handleDistanceChange, placeholder: "0.0", step: "0.1", hint: `Auto-calculates steps (using ${normaliseHeightCm(user?.height)} cm height)` },
                { label: "Steps", type: "number", val: steps, onChange: handleStepsChange, placeholder: "0", hint: "Auto-calculates distance" },
              ].map((f) => (
                <div key={f.label}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>{f.label}</label>
                  <input type={f.type} value={f.val} onChange={f.onChange} placeholder={(f as any).placeholder} step={(f as any).step} min="0" style={iStyle} />
                  {(f as any).hint && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{(f as any).hint}</p>}
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes…" rows={2} style={{ ...iStyle, resize: "none" }} />
              </div>
              <button type="submit" disabled={loading} style={{ padding: "12px", borderRadius: 10, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
                {loading ? "Saving…" : "Save Activity"}
              </button>
            </form>
          ) : isTrialOrPremium(user) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {!user?.isPremium && (
                <div style={{ padding: "8px 12px", backgroundColor: "rgba(200,255,0,0.06)", border: "1px solid rgba(200,255,0,0.2)", borderRadius: 9, fontSize: 12, color: "var(--accent)", display: "flex", alignItems: "center", gap: 6 }}>
                  ⚡ Trial — {trialDaysLeft(user)} day{trialDaysLeft(user) !== 1 ? "s" : ""} remaining
                </div>
              )}
              <MapTracker ref={mapTrackerRef} onUpdate={handleMapUpdate} onComplete={(session: any) => handleSaveSession(session)} distanceUnit={distanceUnit} />
              {/* Distance unit selector */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Distance Unit</label>
                <div style={{ display: "flex", gap: 4, backgroundColor: "var(--bg-surface)", padding: 3, borderRadius: 9 }}>
                  {(["km", "m", "cm"] as const).map(u => (
                    <button key={u} onClick={() => handleDistanceUnitChange(u)} style={{ flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", backgroundColor: distanceUnit === u ? "var(--accent)" : "transparent", color: distanceUnit === u ? "#0A0A0B" : "var(--text-secondary)", transition: "all 0.15s" }}>{u}</button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "24px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MapPin size={22} color="var(--text-muted)" />
              </div>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>Live Tracking</p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 240, lineHeight: 1.6 }}>Live GPS tracking is available for Premium members and during the 7-day free trial.</p>
              <a href="/app/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 9, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                Upgrade to Premium
              </a>
            </div>
          )}
        </div>

        {/* History Panel */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, backgroundColor: "var(--bg-surface)", padding: 3, borderRadius: 10, marginBottom: 16 }}>
            {(["today", "weekly", "monthly"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", backgroundColor: activeTab === tab ? "var(--accent)" : "transparent", color: activeTab === tab ? "#0A0A0B" : "var(--text-secondary)", fontFamily: activeTab === tab ? "'Chakra Petch', sans-serif" : "inherit", transition: "all 0.15s", textTransform: "capitalize" }}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === "today" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{t("todays_summary") || "Today's Summary"}</h3>
              {steps ? (
                <>
                  {[
                    { label: "Steps", val: parseInt(steps).toLocaleString(), color: "var(--accent)" },
                    ...(distanceKm ? [{ label: "Distance", val: (() => { const d = parseFloat(distanceKm); if (isNaN(d)) return `${distanceKm} km`; const display = getDisplayDistance(d * 1000); return `${display.unit === 'km' ? display.value.toFixed(2) : Math.round(display.value)} ${display.unit}`; })(), color: "var(--blue)" }] : []),
                    ...(calories ? [{ label: "Calories", val: `${calories} kcal`, color: "var(--red)" }] : []),
                  ].map((item) => (
                    <div key={item.label} style={{ backgroundColor: "var(--bg-surface)", borderRadius: 12, padding: "14px 16px" }}>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
                      <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 28, fontWeight: 700, color: item.color, lineHeight: 1 }}>{item.val}</p>
                    </div>
                  ))}
                  {notes && <p style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>"{notes}"</p>}
                </>
              ) : (
                <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14, padding: "32px 0" }}>{t("no_data_today_start") || "No activity recorded today yet."}</p>
              )}
            </div>
          )}

          {activeTab === "weekly" && weeklyStats && (
            <div>
              <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Weekly Breakdown</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
                {weeklyStats.entries.map((entry: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "var(--bg-surface)", borderRadius: 10 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{new Date(entry.date).toLocaleDateString()}</p>
                      <p style={{ fontSize: 12, color: "var(--accent)" }}>{entry.steps.toLocaleString()} steps</p>
                    </div>
                    <button onClick={() => handleDeleteEntry(entry.date)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "monthly" && monthlyStats && (
            <div>
              <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Monthly History</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
                {monthlyStats.entries.map((entry: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "var(--bg-surface)", borderRadius: 10 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{new Date(entry.date).toLocaleDateString()}</p>
                      <p style={{ fontSize: 12, color: "var(--accent)" }}>{entry.steps.toLocaleString()} steps</p>
                    </div>
                    <button onClick={() => handleDeleteEntry(entry.date)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
