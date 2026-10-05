import type { BinnedNoteRecord } from "./bin.types";

/**
 * Calculates the number of whole days remaining until permanent deletion.
 */
export function getDaysRemaining(expiresAt: string, nowMs = Date.now()): number {
  const expiresMs = new Date(expiresAt).getTime();
  if (isNaN(expiresMs)) return 0;
  const diffMs = expiresMs - nowMs;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formats the days remaining into a human-friendly string.
 */
export function formatDaysRemaining(days: number): string {
  if (days <= 0) return "Expiring today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

/**
 * Checks if a binned note has reached or passed its 30-day retention window.
 */
export function isExpired(expiresAt: string, nowMs = Date.now()): boolean {
  return getDaysRemaining(expiresAt, nowMs) <= 0;
}

/**
 * Groups binned notes by their original section (e.g. "notes", "dsm", "courses").
 */
export function groupBinnedNotesBySection(
  items: BinnedNoteRecord[]
): Record<string, BinnedNoteRecord[]> {
  const groups: Record<string, BinnedNoteRecord[]> = {};
  for (const item of items) {
    const section = item.originalSection || "notes";
    if (!groups[section]) {
      groups[section] = [];
    }
    groups[section].push(item);
  }
  return groups;
}

/**
 * Groups binned notes by expiration urgency:
 * - Expiring Soon: <= 5 days remaining
 * - Recent: deleted within the last 7 days (>= 23 days remaining)
 * - Older: between 6 and 22 days remaining
 */
export function groupBinnedNotesByAge(
  items: BinnedNoteRecord[],
  nowMs = Date.now()
): {
  expiringSoon: BinnedNoteRecord[];
  recent: BinnedNoteRecord[];
  older: BinnedNoteRecord[];
} {
  const expiringSoon: BinnedNoteRecord[] = [];
  const recent: BinnedNoteRecord[] = [];
  const older: BinnedNoteRecord[] = [];

  for (const item of items) {
    const days = getDaysRemaining(item.expiresAt, nowMs);
    if (days <= 5) {
      expiringSoon.push(item);
    } else if (days >= 23) {
      recent.push(item);
    } else {
      older.push(item);
    }
  }

  return { expiringSoon, recent, older };
}
