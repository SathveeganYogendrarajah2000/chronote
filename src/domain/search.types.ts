/**
 * Chronote Search Domain Types (SEARCH_SPEC.md Sections 2 & 3).
 */

export interface SearchQueryAst {
  rawQuery: string;
  textTokens: string[];
  exactPhrases: string[];
  tags: string[];
  blockTypes: string[];
  documentTypes: Array<"dsm" | "general">;
  languages: string[];
  exactDate?: string | undefined;
  afterDate?: string | undefined;
  beforeDate?: string | undefined;
}

export interface SearchResultItem {
  blockId: string;
  documentId: string;
  documentType: "dsm" | "general";
  documentTitle: string;
  entryId?: string | undefined;
  entryDate?: string | undefined;
  blockType: string;
  language?: string | undefined;
  tags: string[];
  excerpt: string;
  score: number;
}

export interface SearchFilterSuggestion {
  token: string;
  description: string;
  example: string;
}

export const SEARCH_FILTER_SUGGESTIONS: SearchFilterSuggestion[] = [
  { token: "tag:", description: "Filter by topic tag", example: "tag:springboot" },
  { token: "type:code", description: "Filter code snippets", example: "type:code" },
  { token: "type:dsm", description: "Filter Daily Stand-up entries", example: "type:dsm" },
  { token: "type:note", description: "Filter General notes", example: "type:note" },
  { token: "type:image", description: "Filter image figures", example: "type:image" },
  { token: "lang:", description: "Filter by code language", example: "lang:sql" },
  { token: "date:", description: "Match specific standup date", example: "date:2026-09-16" },
  { token: "after:", description: "Entries on or after date", example: "after:2026-09-01" },
  { token: "before:", description: "Entries on or before date", example: "before:2026-09-30" },
];
