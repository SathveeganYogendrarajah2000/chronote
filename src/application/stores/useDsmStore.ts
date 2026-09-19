import { create } from "zustand";
import type { DsmDocument, DsmEntry } from "@domain/dsm.types";
import type { ProseMirrorNode } from "@domain/document.types";
import {
  createDefaultDsmDocument,
  createDefaultDsmEntry,
  isValidIsoDate,
  textToProseMirrorDoc,
} from "@domain/dsm.utils";
import { normalizeTag, isValidTag, normalizeTagList } from "@domain/tagNormalizer";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";

let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export interface DsmState {
  dsmDoc: DsmDocument | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  highlightedDate: string | null;
  searchFilter: string;

  // Actions
  loadDsm: () => Promise<void>;
  saveDsm: () => Promise<void>;
  createOrGetEntry: (date: string, initialTags?: string[], initialText?: string) => DsmEntry;
  toggleEntryCollapse: (entryId: string) => void;
  setAllCollapse: (collapsed: boolean) => void;
  updateEntryContent: (entryId: string, content: ProseMirrorNode) => void;
  updateEntryText: (entryId: string, text: string) => void;
  addEntryTag: (entryId: string, rawTag: string) => void;
  removeEntryTag: (entryId: string, tag: string) => void;
  deleteEntry: (entryId: string) => Promise<void>;
  jumpToDate: (date: string) => DsmEntry | null;
  setSearchFilter: (filter: string) => void;
  clearHighlightedDate: () => void;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const useDsmStore = create<DsmState>((set, get) => ({
  dsmDoc: null,
  isLoading: false,
  isSaving: false,
  isDirty: false,
  highlightedDate: null,
  searchFilter: "",

  loadDsm: async () => {
    set({ isLoading: true });
    try {
      let doc = await ipcBridge.readDsmDocument();
      if (!doc || !doc.entries) {
        doc = createDefaultDsmDocument();
      }

      // If document has no entries at all, initialize with an entry for today
      if (doc.entries.length === 0) {
        const today = getTodayIsoDate();
        const initialEntry = createDefaultDsmEntry(
          today,
          ["engineering"],
          "Daily stand-up notes initialized.\n- Completed:\n- In Progress:\n- Blockers:"
        );
        doc.entries = [initialEntry];
        await ipcBridge.saveDsmDocument(doc);
      }

      set({ dsmDoc: doc, isLoading: false, isDirty: false });
    } catch (err) {
      console.error("Failed to load DSM document:", err);
      // Fallback to in-memory default
      const fallback = createDefaultDsmDocument();
      const today = getTodayIsoDate();
      fallback.entries = [
        createDefaultDsmEntry(today, ["engineering"], "Stand-up notes initialized.")
      ];
      set({ dsmDoc: fallback, isLoading: false, isDirty: false });
    }
  },

  saveDsm: async () => {
    const { dsmDoc } = get();
    if (!dsmDoc) return;

    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = null;
    }

    set({ isSaving: true });
    try {
      const updatedDoc: DsmDocument = {
        ...dsmDoc,
        updatedAt: new Date().toISOString(),
      };
      await ipcBridge.saveDsmDocument(updatedDoc);
      set({ dsmDoc: updatedDoc, isSaving: false, isDirty: false });
    } catch (err) {
      console.error("Failed to save DSM document:", err);
      set({ isSaving: false });
    }
  },

  createOrGetEntry: (date: string, initialTags: string[] = [], initialText = "") => {
    const state = get();
    let doc = state.dsmDoc;
    if (!doc) {
      doc = createDefaultDsmDocument();
    }

    if (!isValidIsoDate(date)) {
      throw new Error(`Invalid ISO date format: ${date}`);
    }

    // Invariant: at most one entry per calendar date (ADR-006)
    const existing = doc.entries.find((e) => e.date === date);
    if (existing) {
      return existing;
    }

    const newEntry = createDefaultDsmEntry(date, initialTags, initialText);
    const updatedEntries = [...doc.entries, newEntry];

    const updatedDoc: DsmDocument = {
      ...doc,
      entries: updatedEntries,
      updatedAt: new Date().toISOString(),
    };

    set({ dsmDoc: updatedDoc, isDirty: true });

    // Schedule debounced autosave
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      void get().saveDsm();
    }, 800);

    return newEntry;
  },

  toggleEntryCollapse: (entryId: string) => {
    const { dsmDoc } = get();
    if (!dsmDoc) return;

    const updatedEntries = dsmDoc.entries.map((entry) => {
      if (entry.id === entryId) {
        return {
          ...entry,
          collapsed: !entry.collapsed,
          updatedAt: new Date().toISOString(),
        };
      }
      return entry;
    });

    const updatedDoc: DsmDocument = {
      ...dsmDoc,
      entries: updatedEntries,
      updatedAt: new Date().toISOString(),
    };

    set({ dsmDoc: updatedDoc, isDirty: true });

    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      void get().saveDsm();
    }, 800);
  },

  setAllCollapse: (collapsed: boolean) => {
    const { dsmDoc } = get();
    if (!dsmDoc) return;

    const updatedEntries = dsmDoc.entries.map((entry) => ({
      ...entry,
      collapsed,
      updatedAt: new Date().toISOString(),
    }));

    const updatedDoc: DsmDocument = {
      ...dsmDoc,
      entries: updatedEntries,
      updatedAt: new Date().toISOString(),
    };

    set({ dsmDoc: updatedDoc, isDirty: true });

    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      void get().saveDsm();
    }, 800);
  },

  updateEntryContent: (entryId: string, content: ProseMirrorNode) => {
    const { dsmDoc } = get();
    if (!dsmDoc) return;

    const updatedEntries = dsmDoc.entries.map((entry) => {
      if (entry.id === entryId) {
        return {
          ...entry,
          content,
          updatedAt: new Date().toISOString(),
        };
      }
      return entry;
    });

    const updatedDoc: DsmDocument = {
      ...dsmDoc,
      entries: updatedEntries,
      updatedAt: new Date().toISOString(),
    };

    set({ dsmDoc: updatedDoc, isDirty: true });

    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      void get().saveDsm();
    }, 800);
  },

  updateEntryText: (entryId: string, text: string) => {
    const { dsmDoc } = get();
    if (!dsmDoc) return;

    const updatedEntries = dsmDoc.entries.map((entry) => {
      if (entry.id === entryId) {
        return {
          ...entry,
          content: textToProseMirrorDoc(text),
          updatedAt: new Date().toISOString(),
        };
      }
      return entry;
    });

    const updatedDoc: DsmDocument = {
      ...dsmDoc,
      entries: updatedEntries,
      updatedAt: new Date().toISOString(),
    };

    set({ dsmDoc: updatedDoc, isDirty: true });

    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      void get().saveDsm();
    }, 800);
  },

  addEntryTag: (entryId: string, rawTag: string) => {
    const normalized = normalizeTag(rawTag);
    if (!isValidTag(normalized)) return;

    const { dsmDoc } = get();
    if (!dsmDoc) return;

    const updatedEntries = dsmDoc.entries.map((entry) => {
      if (entry.id === entryId) {
        const nextTags = normalizeTagList([...entry.tags, normalized]);
        return {
          ...entry,
          tags: nextTags,
          updatedAt: new Date().toISOString(),
        };
      }
      return entry;
    });

    const updatedDoc: DsmDocument = {
      ...dsmDoc,
      entries: updatedEntries,
      updatedAt: new Date().toISOString(),
    };

    set({ dsmDoc: updatedDoc, isDirty: true });

    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      void get().saveDsm();
    }, 800);
  },

  removeEntryTag: (entryId: string, tagToRemove: string) => {
    const { dsmDoc } = get();
    if (!dsmDoc) return;

    const updatedEntries = dsmDoc.entries.map((entry) => {
      if (entry.id === entryId) {
        return {
          ...entry,
          tags: entry.tags.filter((t) => t !== tagToRemove),
          updatedAt: new Date().toISOString(),
        };
      }
      return entry;
    });

    const updatedDoc: DsmDocument = {
      ...dsmDoc,
      entries: updatedEntries,
      updatedAt: new Date().toISOString(),
    };

    set({ dsmDoc: updatedDoc, isDirty: true });

    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      void get().saveDsm();
    }, 800);
  },

  deleteEntry: async (entryId: string) => {
    const { dsmDoc } = get();
    if (!dsmDoc) return;

    const updatedEntries = dsmDoc.entries.filter((entry) => entry.id !== entryId);
    const updatedDoc: DsmDocument = {
      ...dsmDoc,
      entries: updatedEntries,
      updatedAt: new Date().toISOString(),
    };

    set({ dsmDoc: updatedDoc, isDirty: false });
    await ipcBridge.saveDsmDocument(updatedDoc);
  },

  jumpToDate: (date: string) => {
    if (!isValidIsoDate(date)) {
      return null;
    }

    const entry = get().createOrGetEntry(date);

    // Ensure target entry is expanded so user can read/edit it
    if (entry.collapsed) {
      get().toggleEntryCollapse(entry.id);
    }

    set({ highlightedDate: date });

    // Smoothly scroll to the target entry's DOM element if present
    if (typeof document !== "undefined") {
      setTimeout(() => {
        const el = document.getElementById(`dsm-entry-${date}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 50);
    }

    // Auto-clear highlight glow after 3 seconds
    setTimeout(() => {
      if (get().highlightedDate === date) {
        set({ highlightedDate: null });
      }
    }, 3000);

    return entry;
  },

  setSearchFilter: (filter: string) => set({ searchFilter: filter }),
  clearHighlightedDate: () => set({ highlightedDate: null }),
}));
