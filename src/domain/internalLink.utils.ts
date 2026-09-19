/**
 * Chronote Internal Linking Domain Utilities (EDITOR_SPEC.md Section 4 & DOMAIN_MODEL.md Section 3.3).
 * Supports syntax: `[[Note Title]]` or `[[Note Title|Alias]]`.
 */

export interface ParsedInternalLink {
  targetTitle: string;
  alias?: string | undefined;
}

/**
 * Parses raw text inside double brackets e.g. "Spring Security Config|Custom Alias".
 * Returns targetTitle and optional alias.
 */
export function parseInternalLinkText(rawContent: string): ParsedInternalLink | null {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    return null;
  }

  // Handle alias separated by pipe |
  if (trimmed.includes("|")) {
    const parts = trimmed.split("|");
    const targetTitle = parts[0]?.trim();
    const alias = parts.slice(1).join("|").trim();

    if (!targetTitle) {
      return null;
    }

    return {
      targetTitle,
      alias: alias || undefined,
    };
  }

  return {
    targetTitle: trimmed,
  };
}

/**
 * Returns user-visible display text for an internal link.
 * Prioritizes alias if present, otherwise uses target title.
 */
export function getInternalLinkDisplayText(title: string, alias?: string): string {
  if (alias && alias.trim()) {
    return alias.trim();
  }
  return title.trim() || "Untitled Note";
}

/**
 * Filters candidates (General notes or DSM dates) matching a query string.
 */
export function searchLinkCandidates<T extends { id: string; title: string; tags?: string[] }>(
  candidates: T[],
  query: string
): T[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    return candidates;
  }

  return candidates.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(cleanQuery);
    const tagMatch = item.tags?.some((tag) => tag.toLowerCase().includes(cleanQuery));
    return titleMatch || tagMatch;
  });
}
