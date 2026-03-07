/**
 * Real Location Tracking Service
 * Handles real geolocation using browser's Geolocation API
 * and integrates with Google Fit API
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed?: number; // m/s
  altitude?: number;
}

export interface LocationTrackingState {
  isTracking: boolean;
  distance: number; // in kilometers
  locations: LocationCoordinates[];
  startTime: number | null;
  endTime?: number;
  error: string | null;
  watchId?: number;
  totalDuration: number; // in seconds
}

export interface TrackingSession {
  id: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  distance: number;
  locations: LocationCoordinates[];
  avgSpeed: number; // km/h
  maxSpeed: number; // km/h
  saved: boolean;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Both coordinates should be in decimal degrees
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Get current position with high accuracy
 */
export function getCurrentPosition(): Promise<LocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          speed: position.coords.speed || undefined,
          altitude: position.coords.altitude || undefined
        });
      },
      (error) => {
        const errorMessage = getGeolocationErrorMessage(error.code);
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

/**
 * Start real location tracking with continuous position updates
 */
export function startLocationTracking(): Promise<LocationTrackingState> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const initialLocation: LocationCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          speed: position.coords.speed || undefined,
          altitude: position.coords.altitude || undefined
        };

        const state: LocationTrackingState = {
          isTracking: true,
          distance: 0,
          locations: [initialLocation],
          startTime: Date.now(),
          error: null,
          totalDuration: 0
        };

        // Watch position for continuous updates
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation: LocationCoordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
              speed: position.coords.speed || undefined,
              altitude: position.coords.altitude || undefined
            };

            const lastLocation = state.locations[state.locations.length - 1];
            
            // Only add point if accuracy is good (< 20 meters) and distance has changed
            if (newLocation.accuracy < 20) {
              const distanceDelta = calculateDistance(
                lastLocation.latitude,
                lastLocation.longitude,
                newLocation.latitude,
                newLocation.longitude
              );

              // Only record if moved more than 1 meter
              if (distanceDelta > 0.001) {
                state.distance += distanceDelta;
                state.locations.push(newLocation);
              }
            }

            state.totalDuration = Math.floor((Date.now() - state.startTime!) / 1000);
          },
          (error) => {
            state.error = getGeolocationErrorMessage(error.code);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );

        state.watchId = watchId;
        resolve(state);
      },
      (error) => {
        reject(new Error(getGeolocationErrorMessage(error.code)));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

/**
 * Stop location tracking
 */
export function stopLocationTracking(state: LocationTrackingState): LocationTrackingState {
  if (state.watchId !== undefined) {
    navigator.geolocation.clearWatch(state.watchId);
  }

  const endTime = Date.now();
  const duration = Math.floor((endTime - state.startTime!) / 1000);

  return {
    ...state,
    isTracking: false,
    endTime: endTime,
    totalDuration: duration
  };
}

/**
 * Get average speed during tracking (km/h)
 */
export function getAverageSpeed(state: LocationTrackingState): number {
  if (state.startTime === null || state.locations.length < 2) return 0;
  
  const durationHours = (state.totalDuration || (Date.now() - state.startTime)) / (1000 * 60 * 60);
  return state.distance / durationHours;
}

/**
 * Get max speed from tracking points (km/h)
 */
export function getMaxSpeed(state: LocationTrackingState): number {
  let maxSpeed = 0;
  
  for (let i = 0; i < state.locations.length - 1; i++) {
    const loc = state.locations[i];
    if (loc.speed) {
      const speedKmh = loc.speed * 3.6; // Convert m/s to km/h
      maxSpeed = Math.max(maxSpeed, speedKmh);
    }
  }
  
  return maxSpeed;
}

/**
 * Convert tracking state to session for saving
 */
export function createTrackingSession(state: LocationTrackingState): TrackingSession {
  const avgSpeed = getAverageSpeed(state);
  const maxSpeed = getMaxSpeed(state);

  return {
    id: Date.now().toString(),
    startTime: state.startTime!,
    endTime: state.endTime,
    distance: state.distance,
    locations: state.locations,
    avgSpeed,
    maxSpeed,
    saved: false
  };
}

/**
 * Get user-friendly error message for geolocation errors
 */
function getGeolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Permission denied. Please enable location access in your browser settings.';
    case 2:
      return 'Position unavailable. Please check your GPS/location services.';
    case 3:
      return 'Request timed out. Please try again.';
    default:
      return 'An unknown geolocation error occurred.';
  }
}

/**
 * Check if browser supports real-time geolocation
 */
export function isGeolocationSupported(): boolean {
  return !!navigator.geolocation;
}
