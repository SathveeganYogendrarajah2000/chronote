import { normalizeTag, isValidTag } from "./tagNormalizer";
import { isValidIsoDate } from "./dsm.utils";
import type { SearchQueryAst } from "./search.types";

/**
 * Tokenizes a raw search query string while respecting double quotes.
 * Example: `tag:springboot "JWT Token" auth*`
 * Returns: `['tag:springboot', '"JWT Token"', 'auth*']`
 */
export function tokenizeSearchQuery(rawQuery: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < rawQuery.length; i++) {
    const char = rawQuery[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
      current += char;
    } else if (char === " " || char === "\t" || char === "\n") {
      if (insideQuotes) {
        current += char;
      } else if (current.trim().length > 0) {
        tokens.push(current.trim());
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.trim().length > 0) {
    tokens.push(current.trim());
  }

  return tokens;
}

/**
 * Parses raw search input string into a structured SearchQueryAst (SEARCH_SPEC.md Section 3).
 */
export function parseSearchQuery(rawQuery: string): SearchQueryAst {
  const ast: SearchQueryAst = {
    rawQuery,
    textTokens: [],
    exactPhrases: [],
    tags: [],
    blockTypes: [],
    documentTypes: [],
    languages: [],
    exactDate: undefined,
    afterDate: undefined,
    beforeDate: undefined,
  };

  if (!rawQuery || !rawQuery.trim()) {
    return ast;
  }

  const rawTokens = tokenizeSearchQuery(rawQuery);

  for (const token of rawTokens) {
    // 1. Quoted exact phrase: "Null Pointer Exception"
    if (token.startsWith('"') && token.endsWith('"') && token.length >= 2) {
      const phrase = token.slice(1, -1).trim();
      if (phrase.length > 0) {
        ast.exactPhrases.push(phrase);
      }
      continue;
    }

    // 2. Filter predicates: key:value
    const colonIndex = token.indexOf(":");
    if (colonIndex > 0) {
      const key = token.slice(0, colonIndex).toLowerCase();
      let value = token.slice(colonIndex + 1);

      // Strip surrounding quotes if present in value: key:"val"
      if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
        value = value.slice(1, -1);
      }

      if (value.trim().length > 0) {
        switch (key) {
          case "tag": {
            const normalized = normalizeTag(value);
            if (isValidTag(normalized) && !ast.tags.includes(normalized)) {
              ast.tags.push(normalized);
            }
            break;
          }
          case "type": {
            const lowerType = value.toLowerCase();
            if (lowerType === "dsm" && !ast.documentTypes.includes("dsm")) {
              ast.documentTypes.push("dsm");
            } else if (
              (lowerType === "note" || lowerType === "general") &&
              !ast.documentTypes.includes("general")
            ) {
              ast.documentTypes.push("general");
            } else if (lowerType === "code") {
              if (!ast.blockTypes.includes("code")) ast.blockTypes.push("code");
            } else if (lowerType === "image") {
              if (!ast.blockTypes.includes("image")) ast.blockTypes.push("image");
            } else if (!ast.blockTypes.includes(lowerType)) {
              ast.blockTypes.push(lowerType);
            }
            break;
          }
          case "lang":
          case "language": {
            const lowerLang = value.toLowerCase();
            if (!ast.languages.includes(lowerLang)) {
              ast.languages.push(lowerLang);
            }
            break;
          }
          case "date": {
            if (isValidIsoDate(value)) {
              ast.exactDate = value;
            }
            break;
          }
          case "after": {
            if (isValidIsoDate(value)) {
              ast.afterDate = value;
            }
            break;
          }
          case "before": {
            if (isValidIsoDate(value)) {
              ast.beforeDate = value;
            }
            break;
          }
          default:
            // Unrecognized predicate key; treat as free text
            ast.textTokens.push(token);
            break;
        }
        continue;
      }
    }

    // 3. Free text tokens
    ast.textTokens.push(token);
  }

  return ast;
}

/**
 * Returns true if the query has no search predicates, tokens, or phrases.
 */
export function isQueryEmpty(ast: SearchQueryAst): boolean {
  return (
    ast.textTokens.length === 0 &&
    ast.exactPhrases.length === 0 &&
    ast.tags.length === 0 &&
    ast.blockTypes.length === 0 &&
    ast.documentTypes.length === 0 &&
    ast.languages.length === 0 &&
    !ast.exactDate &&
    !ast.afterDate &&
    !ast.beforeDate
  );
}

/**
 * Sanitizes a plain word token for safe inclusion in an FTS5 MATCH clause.
 */
export function sanitizeFtsToken(raw: string): string {
  // Preserve trailing asterisk for prefix matching
  const hasPrefixStar = raw.endsWith("*");
  const clean = raw.replace(/[^a-zA-Z0-9_\-]/g, "");
  if (!clean) return "";
  return hasPrefixStar ? `${clean}*` : clean;
}

/**
 * Compiles a SearchQueryAst into an SQLite FTS5 MATCH string (SEARCH_SPEC.md Section 4.2).
 * Returns null if no FTS5-matchable tokens are present.
 */
export function compileFts5Match(ast: SearchQueryAst): string | null {
  const parts: string[] = [];

  // 1. Tags match
  for (const tag of ast.tags) {
    const clean = sanitizeFtsToken(tag);
    if (clean) {
      parts.push(`tags:${clean}`);
    }
  }

  // 2. Block types match
  for (const type of ast.blockTypes) {
    if (type === "code") {
      parts.push(`block_type:code*`);
    } else {
      const clean = sanitizeFtsToken(type);
      if (clean) {
        parts.push(`block_type:${clean}`);
      }
    }
  }

  // 3. Language match
  for (const lang of ast.languages) {
    const clean = sanitizeFtsToken(lang);
    if (clean) {
      parts.push(`language:${clean}`);
    }
  }

  // 4. Exact phrases match: "..."
  for (const phrase of ast.exactPhrases) {
    const cleanPhrase = phrase.replace(/"/g, '""');
    if (cleanPhrase.trim()) {
      parts.push(`"${cleanPhrase}"`);
    }
  }

  // 5. Free-text tokens
  for (const token of ast.textTokens) {
    const clean = sanitizeFtsToken(token);
    if (clean) {
      // If token does not specify a prefix star, search both exact and prefix match
      const term = clean.endsWith("*") ? clean : `${clean}*`;
      parts.push(term);
    }
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" AND ");
}
