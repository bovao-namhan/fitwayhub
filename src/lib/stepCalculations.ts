/**
 * Step Calculation Logic — v2
 *
 * Improvements over v1:
 * • Gender-specific stride-length multipliers (male / female / other)
 * • Walking vs Running stride adjustment
 * • Accelerometer-based step detection via DeviceMotion API
 * • More granular MET table (Compendium of Physical Activities)
 * • Kalman-inspired GPS smoothing helper
 * • Cadence estimation from accelerometer
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserMetrics {
  height: number; // cm
  weight: number; // kg
  gender: 'male' | 'female' | 'other';
}

export type ActivityMode = 'walking' | 'running';

// ─── Stride / Step Length ─────────────────────────────────────────────────────

/**
 * Gender-specific walking stride multipliers (peer-reviewed averages):
 *   Male   : height × 0.415
 *   Female : height × 0.413
 *   Other  : height × 0.414 (average)
 *
 * Running adds ~40 % to stride length on average.
 */
const STRIDE_MULTIPLIER: Record<string, number> = {
  male: 0.415,
  female: 0.413,
  other: 0.414,
};

const RUNNING_STRIDE_FACTOR = 1.40;

/**
 * Normalise a raw height value to centimetres.
 * • null / undefined / NaN / ≤ 0 → falls back to 170 cm
 * • values ≤ 3 are assumed to be metres (e.g. 1.75) → multiplied by 100
 * • values in [3, 100) are assumed to be invalid → fall back to 170 cm
 * • values ≥ 100 are treated as centimetres
 */
export function normaliseHeightCm(raw: number | null | undefined): number {
  const h = Number(raw);
  if (!h || isNaN(h) || h <= 0) return 170;
  if (h <= 3) return h * 100;       // looks like metres
  if (h < 100) return 170;          // ambiguous / invalid
  return h;                          // already in cm
}

export function calculateStepLength(
  heightCm: number | null | undefined,
  gender: 'male' | 'female' | 'other' = 'other',
  mode: ActivityMode = 'walking',
): number {
  const safeCm = normaliseHeightCm(heightCm);
  const base = (STRIDE_MULTIPLIER[gender] || 0.414) * safeCm / 100; // metres
  return mode === 'running' ? base * RUNNING_STRIDE_FACTOR : base;
}

// ─── Steps ↔ Distance ────────────────────────────────────────────────────────

export function calculateStepsFromDistance(
  distanceKm: number,
  userMetrics: UserMetrics,
  mode: ActivityMode = 'walking',
): number {
  const distanceMeters = distanceKm * 1000;
  const stepLen = calculateStepLength(userMetrics.height, userMetrics.gender, mode);
  if (stepLen <= 0) return 0;
  return Math.round(distanceMeters / stepLen);
}

export function calculateDistanceFromSteps(
  steps: number,
  userMetrics: UserMetrics,
  mode: ActivityMode = 'walking',
): number {
  const stepLen = calculateStepLength(userMetrics.height, userMetrics.gender, mode);
  if (stepLen <= 0 || steps <= 0) return 0;
  return parseFloat(((steps * stepLen) / 1000).toFixed(3));
}

// ─── Calorie Estimation (simple fallback) ─────────────────────────────────────

export function estimateCaloriesBurned(
  steps: number,
  weightKg: number,
  heightCm: number | null | undefined,
): number {
  const safeCm = normaliseHeightCm(heightCm);
  const baseCaloriesPerStep = 0.05;
  const weightAdj = (weightKg && weightKg > 0) ? weightKg / 70 : 1;
  const heightAdj = 1 + (safeCm - 170) * 0.001;
  return Math.round(steps * baseCaloriesPerStep * weightAdj * heightAdj);
}

// ─── MET-based Calorie Calculation ────────────────────────────────────────────

/**
 * Granular MET table from the Compendium of Physical Activities.
 */
function speedToMET(speedKmh: number, mode: ActivityMode = 'walking'): number {
  if (mode === 'running') {
    if (speedKmh < 6.4) return 6.0;  // light jog
    if (speedKmh < 8.0) return 8.3;
    if (speedKmh < 9.7) return 9.8;
    if (speedKmh < 11.3) return 11.0;
    if (speedKmh < 12.9) return 11.8;
    return 12.8;
  }
  // Walking
  if (speedKmh < 2.7) return 2.0;  // very slow stroll
  if (speedKmh < 3.2) return 2.8;  // slow walk
  if (speedKmh < 4.0) return 3.0;  // moderate
  if (speedKmh < 4.8) return 3.5;  // normal walk
  if (speedKmh < 5.6) return 4.3;  // brisk walk
  if (speedKmh < 6.4) return 5.0;  // very brisk / race walking
  return 5.0;
}

export function calculateCaloriesMET(params: {
  weightKg: number;
  heightCm?: number;
  steps?: number;
  distanceKm?: number;
  gender?: 'male' | 'female' | 'other';
  speedKmh?: number;
  met?: number;
  mode?: ActivityMode;
}): { calories: number; distanceKm?: number; durationMinutes?: number; met: number } {
  const {
    weightKg,
    heightCm,
    steps,
    distanceKm: providedDist,
    gender = 'other',
    speedKmh,
    met,
    mode = 'walking',
  } = params;

  if (!weightKg || weightKg <= 0) return { calories: 0, met: met || 0 };

  const safeHeightCm = normaliseHeightCm(heightCm);
  let distanceKm = providedDist;

  if ((distanceKm == null || isNaN(distanceKm)) && steps) {
    const stride = calculateStepLength(safeHeightCm, gender, mode);
    distanceKm = (stride * steps) / 1000;
  }

  let usedMet = met || 0;
  if (!usedMet) {
    usedMet = (speedKmh && speedKmh > 0)
      ? speedToMET(speedKmh, mode)
      : (mode === 'running' ? 8.3 : 3.5);
  }

  let durationMinutes: number | undefined;
  if (distanceKm != null && speedKmh && speedKmh > 0) {
    durationMinutes = (distanceKm / speedKmh) * 60;
  } else if (distanceKm != null) {
    const assumedSpeed = mode === 'running' ? 8.0 : 4.8;
    durationMinutes = (distanceKm / assumedSpeed) * 60;
  }

  let calories = 0;
  if (durationMinutes && durationMinutes > 0) {
    calories = Math.round((durationMinutes * (usedMet * 3.5 * weightKg)) / 200);
  } else if (steps) {
    calories = estimateCaloriesBurned(steps, weightKg, safeHeightCm);
  }

  return { calories, distanceKm, durationMinutes, met: usedMet };
}

// ─── Accelerometer-based Step Detection ───────────────────────────────────────

/**
 * Detects steps using the DeviceMotion API (accelerometer).
 *
 * Algorithm (v3 — robust):
 * 1. Prefer `event.acceleration` (gravity pre-removed by device sensor fusion).
 *    Falls back to `accelerationIncludingGravity` with a high-pass filter to
 *    isolate movement from gravity.
 * 2. Compute the magnitude of the gravity-free acceleration vector.
 * 3. Apply a band-pass-style filter (moderate low-pass to remove noise).
 * 4. Detect peaks above a dynamic threshold — each peak = one step.
 * 5. Enforce a minimum interval between peaks (250 ms walk, 180 ms run)
 *    to avoid double-counting.
 *
 * Returns a cleanup function to call when tracking stops.
 */

export interface AccelerometerStepCounter {
  start: () => () => void;
  getSteps: () => number;
  getCadence: () => number;
  reset: () => void;
  /** Whether the device is actually sending motion data */
  isActive: () => boolean;
}

export function createAccelerometerCounter(mode: ActivityMode = 'walking'): AccelerometerStepCounter | null {
  if (typeof window === 'undefined') return null;
  if (!('DeviceMotionEvent' in window)) return null;

  let stepCount = 0;
  let lastStepTime = 0;
  // Walking: max ~2.5 steps/sec → 400ms between steps
  // Running: max ~4 steps/sec → 250ms between steps
  const MIN_STEP_INTERVAL = mode === 'running' ? 250 : 400;

  // ── Band-pass filtering ──
  // Low-pass alpha: 0.25 smooths out hand-shake / phone vibration noise
  let filteredMag = 0;
  const ALPHA = 0.25;

  // Previous filtered value for peak detection
  let lastMag = 0;
  let rising = false;

  // ── Thresholds ──
  // Walking peaks are typically 1.5–4 m/s² (gravity-free); threshold at 1.5 avoids hand noise
  // Running peaks are typically 3–8 m/s²; threshold at 2.5
  const THRESHOLD_WALK = 1.5;
  const THRESHOLD_RUN = 2.5;
  let threshold = mode === 'running' ? THRESHOLD_RUN : THRESHOLD_WALK;

  // ── Consecutive peak validation ──
  // Require 2 consecutive valid peaks before counting to filter one-off noise spikes
  let consecutiveValidPeaks = 0;
  const WARMUP_PEAKS = 2;
  let warmedUp = false;
  // Track recent peak magnitudes for better dynamic threshold
  const recentPeakMags: number[] = [];
  const MAX_PEAK_HISTORY = 20;

  const recentStepTimestamps: number[] = [];
  const CADENCE_WINDOW = 10_000;

  // Track if we've received any real motion events (non-null data)
  let hasReceivedMotion = false;
  let motionEventCount = 0;

  // ── High-pass filter state (for accelerationIncludingGravity fallback) ──
  // This isolates movement from the constant gravity vector per axis
  let gravX = 0, gravY = 0, gravZ = 0;
  const HP_ALPHA = 0.8; // high-pass: higher = more gravity removed, slower adapt

  const handleMotion = (event: DeviceMotionEvent) => {
    let ax: number, ay: number, az: number;

    // Prefer gravity-free acceleration when available (most modern phones)
    const pureAcc = event.acceleration;
    if (pureAcc && pureAcc.x != null && pureAcc.y != null && pureAcc.z != null &&
        (pureAcc.x !== 0 || pureAcc.y !== 0 || pureAcc.z !== 0)) {
      ax = pureAcc.x;
      ay = pureAcc.y;
      az = pureAcc.z;
    } else {
      // Fallback: high-pass filter on accelerationIncludingGravity to remove gravity
      const accG = event.accelerationIncludingGravity;
      if (!accG || accG.x == null || accG.y == null || accG.z == null) return;

      const rawX = accG.x ?? 0;
      const rawY = accG.y ?? 0;
      const rawZ = accG.z ?? 0;

      // Estimate gravity component with low-pass filter per axis
      gravX = HP_ALPHA * gravX + (1 - HP_ALPHA) * rawX;
      gravY = HP_ALPHA * gravY + (1 - HP_ALPHA) * rawY;
      gravZ = HP_ALPHA * gravZ + (1 - HP_ALPHA) * rawZ;

      // Subtract estimated gravity to get movement acceleration
      ax = rawX - gravX;
      ay = rawY - gravY;
      az = rawZ - gravZ;
    }

    motionEventCount++;
    if (!hasReceivedMotion && (ax !== 0 || ay !== 0 || az !== 0)) {
      hasReceivedMotion = true;
    }

    // Magnitude of gravity-free acceleration
    const rawMag = Math.sqrt(ax * ax + ay * ay + az * az);

    // Low-pass filter smooths the magnitude signal
    filteredMag = ALPHA * rawMag + (1 - ALPHA) * filteredMag;
    const now = Date.now();

    // ── Peak detection: rising → falling through threshold = step ──
    if (filteredMag > lastMag) {
      rising = true;
    } else if (rising && lastMag > threshold) {
      // We were rising and now we've started falling, and the peak exceeded threshold
      rising = false;

      // Reject peaks that are unrealistically large (phone dropped / shaken hard)
      const maxPeak = mode === 'running' ? 20.0 : 12.0;
      if (lastMag > maxPeak) {
        // Ignore — not a step
      } else if (now - lastStepTime > MIN_STEP_INTERVAL) {
        // ── Warmup validation: require consecutive valid peaks before counting ──
        if (!warmedUp) {
          consecutiveValidPeaks++;
          if (consecutiveValidPeaks >= WARMUP_PEAKS) {
            warmedUp = true;
            stepCount += consecutiveValidPeaks; // credit the warmup peaks
            lastStepTime = now;
            for (let i = 0; i < consecutiveValidPeaks; i++) recentStepTimestamps.push(now);
          }
        } else {
          stepCount++;
          lastStepTime = now;
          recentStepTimestamps.push(now);
        }

        // Track peak magnitudes for dynamic threshold
        recentPeakMags.push(lastMag);
        if (recentPeakMags.length > MAX_PEAK_HISTORY) recentPeakMags.shift();

        while (recentStepTimestamps.length > 0 && recentStepTimestamps[0] < now - CADENCE_WINDOW) {
          recentStepTimestamps.shift();
        }

        // Dynamic threshold: use median of recent peaks × 0.5, clamped to sane range
        if (recentPeakMags.length >= 8) {
          const sorted = [...recentPeakMags].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          threshold = Math.max(
            mode === 'running' ? 1.8 : 1.0,
            Math.min(median * 0.5, mode === 'running' ? 6.0 : 4.0),
          );
        }
      } else {
        // Too soon after last step — likely noise, reset consecutive counter if not warmed up
        if (!warmedUp) consecutiveValidPeaks = 0;
      }
    } else if (!rising && filteredMag < threshold * 0.3) {
      // If signal goes very low without a valid peak, reset warmup
      if (!warmedUp && (now - lastStepTime > 2000)) {
        consecutiveValidPeaks = 0;
      }
    }
    lastMag = filteredMag;
  };

  return {
    start() {
      stepCount = 0;
      lastStepTime = 0;
      filteredMag = 0;
      lastMag = 0;
      rising = false;
      hasReceivedMotion = false;
      motionEventCount = 0;
      gravX = 0; gravY = 0; gravZ = 0;
      consecutiveValidPeaks = 0;
      warmedUp = false;
      recentPeakMags.length = 0;
      recentStepTimestamps.length = 0;
      threshold = mode === 'running' ? THRESHOLD_RUN : THRESHOLD_WALK;

      // Request permission on iOS 13+ (required by Safari)
      const DME = DeviceMotionEvent as any;
      if (typeof DME.requestPermission === 'function') {
        DME.requestPermission()
          .then((permissionState: string) => {
            if (permissionState === 'granted') {
              window.addEventListener('devicemotion', handleMotion);
            } else {
              console.warn('[StepCounter] DeviceMotion permission denied');
            }
          })
          .catch((err: any) => {
            console.warn('[StepCounter] DeviceMotion permission error:', err);
            // Try adding listener anyway — some browsers don't need explicit permission
            window.addEventListener('devicemotion', handleMotion);
          });
      } else {
        window.addEventListener('devicemotion', handleMotion);
      }

      return () => window.removeEventListener('devicemotion', handleMotion);
    },
    getSteps: () => stepCount,
    isActive: () => hasReceivedMotion,
    getCadence(): number {
      const now = Date.now();
      const recent = recentStepTimestamps.filter(t => t > now - CADENCE_WINDOW);
      if (recent.length < 2) return 0;
      const windowSec = (now - recent[0]) / 1000;
      return windowSec > 0 ? Math.round((recent.length / windowSec) * 60) : 0;
    },
    reset() {
      stepCount = 0;
      lastStepTime = 0;
      recentStepTimestamps.length = 0;
    },
  };
}

// ─── GPS Kalman Smoothing Filter ──────────────────────────────────────────────

/**
 * Kalman-inspired 1D filter for GPS coordinates.
 * Reduces jitter by blending new readings with prior estimates,
 * weighted by reported accuracy.
 */
export class GpsKalmanFilter {
  private lat = 0;
  private lng = 0;
  private variance = 1e10;

  constructor(private readonly processNoise = 3) {}

  update(lat: number, lng: number, accuracy: number): { lat: number; lng: number } {
    if (this.variance > 1e9) {
      this.lat = lat;
      this.lng = lng;
      this.variance = accuracy * accuracy;
      return { lat, lng };
    }
    this.variance += this.processNoise * this.processNoise;
    const K = this.variance / (this.variance + accuracy * accuracy);
    this.lat += K * (lat - this.lat);
    this.lng += K * (lng - this.lng);
    this.variance *= (1 - K);
    return { lat: this.lat, lng: this.lng };
  }

  reset() {
    this.variance = 1e10;
  }
}
