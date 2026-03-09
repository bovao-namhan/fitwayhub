import { execSync } from 'child_process';
import path from 'path';

/**
 * Extract video duration in seconds using ffprobe
 * Falls back to reading file metadata if ffprobe is not available
 */
export async function getVideoDuration(filePath: string): Promise<number | null> {
  try {
    // Try using ffprobe first
    try {
      const result = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1:noprint_wrappers=1 "${filePath}" 2>/dev/null`, { encoding: 'utf-8' });
      const duration = parseFloat(result.trim());
      return isNaN(duration) ? null : Math.round(duration);
    } catch (e) {
      // ffprobe not available, try using MediaInfo if installed
      try {
        const result = execSync(`mediainfo --Inform="General;%Duration%" "${filePath}" 2>/dev/null`, { encoding: 'utf-8' });
        const duration = parseInt(result.trim()) / 1000; // MediaInfo returns milliseconds
        return isNaN(duration) ? null : Math.round(duration);
      } catch {
        // If both tools fail, return null but don't throw
        console.warn(`Could not extract duration from video: ${filePath}`);
        return null;
      }
    }
  } catch (error) {
    console.error('Error getting video duration:', error);
    return null;
  }
}

/**
 * Convert seconds to a readable format (e.g., "5 min 30 sec")
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "Unknown";
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (minutes < 60) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
