import { create } from "zustand";
import type { SearchQueryAst, SearchResultItem } from "@domain/search.types";
import { parseSearchQuery, isQueryEmpty } from "@domain/search.parser";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";

const STORAGE_KEY_RECENT_SEARCHES = "chronote_recent_searches";

function loadRecentSearches(): string[] {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY_RECENT_SEARCHES);
      if (raw) return JSON.parse(raw) as string[];
    }
  } catch {
    // Ignore storage issues
  }
  return ["tag:springboot", "type:code", "date:2026-09-16"];
}

function saveRecentSearches(items: string[]): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(items.slice(0, 10)));
    }
  } catch {
    // Ignore
  }
}

interface SearchState {
  rawQuery: string;
  ast: SearchQueryAst;
  results: SearchResultItem[];
  isSearching: boolean;
  selectedIndex: number;
  recentQueries: string[];
  error: string | null;

  setQuery: (query: string) => void;
  executeSearch: () => Promise<void>;
  selectNextResult: () => void;
  selectPrevResult: () => void;
  appendFilter: (filterToken: string) => void;
  clearSearch: () => void;
  addRecentQuery: (query: string) => void;
  removeRecentQuery: (query: string) => void;
}

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useSearchStore = create<SearchState>((set, get) => ({
  rawQuery: "",
  ast: parseSearchQuery(""),
  results: [],
  isSearching: false,
  selectedIndex: -1,
  recentQueries: loadRecentSearches(),
  error: null,

  setQuery: (rawQuery: string) => {
    const ast = parseSearchQuery(rawQuery);
    set({ rawQuery, ast, error: null });

    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    if (isQueryEmpty(ast)) {
      set({ results: [], isSearching: false, selectedIndex: -1 });
      return;
    }

    set({ isSearching: true });
    searchDebounceTimer = setTimeout(() => {
      void get().executeSearch();
    }, 150);
  },

  executeSearch: async () => {
    const { rawQuery, ast } = get();
    if (isQueryEmpty(ast)) {
      set({ results: [], isSearching: false, selectedIndex: -1 });
      return;
    }

    set({ isSearching: true, error: null });
    try {
      const results = await ipcBridge.searchWorkspace(rawQuery);
      set({
        results,
        isSearching: false,
        selectedIndex: results.length > 0 ? 0 : -1,
      });

      if (rawQuery.trim().length > 2) {
        get().addRecentQuery(rawQuery.trim());
      }
    } catch (err) {
      set({
        isSearching: false,
        error: err instanceof Error ? err.message : String(err),
        results: [],
        selectedIndex: -1,
      });
    }
  },

  selectNextResult: () => {
    const { results, selectedIndex } = get();
    if (results.length === 0) return;
    const next = (selectedIndex + 1) % results.length;
    set({ selectedIndex: next });
  },

  selectPrevResult: () => {
    const { results, selectedIndex } = get();
    if (results.length === 0) return;
    const prev = (selectedIndex - 1 + results.length) % results.length;
    set({ selectedIndex: prev });
  },

  appendFilter: (filterToken: string) => {
    const current = get().rawQuery.trim();
    const newQuery = current ? `${current} ${filterToken}` : filterToken;
    get().setQuery(newQuery);
  },

  clearSearch: () => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    set({
      rawQuery: "",
      ast: parseSearchQuery(""),
      results: [],
      isSearching: false,
      selectedIndex: -1,
      error: null,
    });
  },

  addRecentQuery: (query: string) => {
    const filtered = get().recentQueries.filter((q) => q !== query);
    const updated = [query, ...filtered].slice(0, 10);
    saveRecentSearches(updated);
    set({ recentQueries: updated });
  },

  removeRecentQuery: (query: string) => {
    const updated = get().recentQueries.filter((q) => q !== query);
    saveRecentSearches(updated);
    set({ recentQueries: updated });
  },
}));
