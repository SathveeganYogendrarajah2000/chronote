/**
 * Tag normalization domain rules (DOMAIN_MODEL.md Section 3.1).
 *
 * Rules:
 * - Leading '#' and surrounding whitespace stripped.
 * - Normalized to lowercase.
 * - Must match ^[a-z0-9_\-]+$
 * - Collections of tags are strictly unique sets.
 */

const TAG_REGEX = /^[a-z0-9_\-]+$/;

export function normalizeTag(rawTag: string): string {
  if (!rawTag) return "";
  const cleaned = rawTag.trim().replace(/^#+/, "").toLowerCase();
  return cleaned;
}

export function isValidTag(tag: string): boolean {
  if (!tag) return false;
  const normalized = normalizeTag(tag);
  return normalized.length > 0 && TAG_REGEX.test(normalized);
}

export function normalizeTagList(rawTags: readonly string[]): string[] {
  const set = new Set<string>();
  for (const raw of rawTags) {
    const normalized = normalizeTag(raw);
    if (normalized.length > 0 && TAG_REGEX.test(normalized)) {
      set.add(normalized);
    }
  }
  return Array.from(set).sort();
}
