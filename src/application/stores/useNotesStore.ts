import { create } from "zustand";
import type { GeneralNote } from "@domain/note.types";
import type { ProseMirrorNode } from "@domain/document.types";
import {
  createDefaultGeneralNote,
  textToProseMirrorDoc,
} from "@domain/note.utils";
import { normalizeTag, isValidTag } from "@domain/tagNormalizer";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";
import { useTabsStore } from "./useTabsStore";
import { useWorkspaceStore } from "./useWorkspaceStore";
import { useResourceStore } from "./useResourceStore";
import { useBinStore } from "./useBinStore";

let noteSaveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export interface NotesState {
  activeNote: GeneralNote | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  filterQuery: string;
  selectedTag: string | null;
  selectedTags: string[];
  tagMatchMode: "and" | "or";
  deleteCandidateId: string | null;

  // Actions
  loadNote: (id: string) => Promise<GeneralNote | null>;
  createNote: (params?: {
    title?: string;
    tags?: string[];
    section?: string;
    initialText?: string;
  }) => Promise<GeneralNote>;
  saveCurrentNote: () => Promise<void>;
  updateTitle: (title: string) => void;
  updateSection: (section: string) => void;
  updateContent: (content: ProseMirrorNode) => void;
  updateContentText: (text: string) => void;
  addTag: (rawTag: string) => void;
  removeTag: (tag: string) => void;
  togglePin: (id: string) => Promise<void>;
  moveNoteToSection: (id: string, section: string) => Promise<void>;
  setDeleteCandidateId: (id: string | null) => void;
  deleteNote: (id: string) => Promise<void>;
  deleteNotePermanently: (id: string) => Promise<void>;
  setFilterQuery: (query: string) => void;
  setSelectedTag: (tag: string | null) => void;
  toggleTagFilter: (tag: string) => void;
  setSelectedTags: (tags: string[]) => void;
  clearTagFilters: () => void;
  setTagMatchMode: (mode: "and" | "or") => void;
  clearActiveNote: () => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  activeNote: null,
  isLoading: false,
  isSaving: false,
  isDirty: false,
  filterQuery: "",
  selectedTag: null,
  selectedTags: [],
  tagMatchMode: "and",
  deleteCandidateId: null,

  loadNote: async (id: string) => {
    const { activeNote, isDirty } = get();
    // If switching away from a dirty note, force an immediate save first
    if (activeNote && activeNote.id !== id && isDirty) {
      await get().saveCurrentNote();
    }

    if (activeNote && activeNote.id === id) {
      return activeNote;
    }

    set({ isLoading: true });
    try {
      const note = await ipcBridge.readGeneralNote(id);
      set({ activeNote: note, isLoading: false, isDirty: false });
      return note;
    } catch (err) {
      console.error(`Failed to load general note ${id}:`, err);
      set({ activeNote: null, isLoading: false, isDirty: false });
      return null;
    }
  },

  createNote: async (params) => {
    const { activeNote, isDirty } = get();
    if (activeNote && isDirty) {
      await get().saveCurrentNote();
    }

    const newNote = createDefaultGeneralNote(params);

    try {
      await ipcBridge.saveGeneralNote(newNote);
      // Refresh workspace note list so sidebar is immediately updated
      await useWorkspaceStore.getState().refreshNotes();

      // Open a tab for the new note
      useTabsStore.getState().openTab({
        id: `tab_${newNote.id}`,
        documentId: newNote.id,
        documentType: "general",
        title: newNote.title,
        isPinned: newNote.pinned,
      });

      set({ activeNote: newNote, isDirty: false });
      return newNote;
    } catch (err) {
      console.error("Failed to create general note:", err);
      throw err;
    }
  },

  saveCurrentNote: async () => {
    const { activeNote } = get();
    if (!activeNote) return;

    if (noteSaveDebounceTimer) {
      clearTimeout(noteSaveDebounceTimer);
      noteSaveDebounceTimer = null;
    }

    set({ isSaving: true });
    try {
      const updatedNote: GeneralNote = {
        ...activeNote,
        updatedAt: new Date().toISOString(),
      };

      await ipcBridge.saveGeneralNote(updatedNote);
      set({ activeNote: updatedNote, isSaving: false, isDirty: false });

      // Refresh recentNotes metadata in workspace store asynchronously
      void useWorkspaceStore.getState().refreshNotes();

      // Refresh resource inspector in real-time
      void useResourceStore.getState().refresh(updatedNote.id);
    } catch (err) {
      console.error(`Failed to save note ${activeNote.id}:`, err);
      set({ isSaving: false });
    }
  },

  updateTitle: (title: string) => {
    const { activeNote } = get();
    if (!activeNote) return;

    const trimmedTitle = title;
    const updatedNote: GeneralNote = {
      ...activeNote,
      title: trimmedTitle,
    };

    set({ activeNote: updatedNote, isDirty: true });

    // Update tab bar title immediately for snappy feedback
    useTabsStore.getState().updateTabTitle(activeNote.id, trimmedTitle || "Untitled Note");

    // Debounced disk save
    if (noteSaveDebounceTimer) {
      clearTimeout(noteSaveDebounceTimer);
    }
    noteSaveDebounceTimer = setTimeout(() => {
      void get().saveCurrentNote();
    }, 800);
  },

  updateSection: (section: string) => {
    const { activeNote } = get();
    if (!activeNote) return;

    const trimmed = section.trim() || "General";
    const updatedNote: GeneralNote = {
      ...activeNote,
      section: trimmed,
    };

    set({ activeNote: updatedNote, isDirty: true });

    if (noteSaveDebounceTimer) {
      clearTimeout(noteSaveDebounceTimer);
    }
    noteSaveDebounceTimer = setTimeout(() => {
      void get().saveCurrentNote();
    }, 400);
  },

  updateContent: (content: ProseMirrorNode) => {
    const { activeNote } = get();
    if (!activeNote) return;

    const updatedNote: GeneralNote = {
      ...activeNote,
      content,
    };

    set({ activeNote: updatedNote, isDirty: true });

    if (noteSaveDebounceTimer) {
      clearTimeout(noteSaveDebounceTimer);
    }
    noteSaveDebounceTimer = setTimeout(() => {
      void get().saveCurrentNote();
    }, 800);
  },

  updateContentText: (text: string) => {
    const { activeNote } = get();
    if (!activeNote) return;

    const contentNode = textToProseMirrorDoc(text);
    const updatedNote: GeneralNote = {
      ...activeNote,
      content: contentNode,
    };

    set({ activeNote: updatedNote, isDirty: true });

    if (noteSaveDebounceTimer) {
      clearTimeout(noteSaveDebounceTimer);
    }
    noteSaveDebounceTimer = setTimeout(() => {
      void get().saveCurrentNote();
    }, 800);
  },

  addTag: (rawTag: string) => {
    const { activeNote } = get();
    if (!activeNote) return;

    const normalized = normalizeTag(rawTag);
    if (!isValidTag(normalized) || activeNote.tags.includes(normalized)) {
      return;
    }

    const updatedTags = [...activeNote.tags, normalized].sort();
    const updatedNote: GeneralNote = {
      ...activeNote,
      tags: updatedTags,
    };

    set({ activeNote: updatedNote, isDirty: true });

    if (noteSaveDebounceTimer) {
      clearTimeout(noteSaveDebounceTimer);
    }
    noteSaveDebounceTimer = setTimeout(() => {
      void get().saveCurrentNote();
    }, 800);
  },

  removeTag: (tag: string) => {
    const { activeNote } = get();
    if (!activeNote) return;

    const updatedTags = activeNote.tags.filter((t) => t !== tag);
    const updatedNote: GeneralNote = {
      ...activeNote,
      tags: updatedTags,
    };

    set({ activeNote: updatedNote, isDirty: true });

    if (noteSaveDebounceTimer) {
      clearTimeout(noteSaveDebounceTimer);
    }
    noteSaveDebounceTimer = setTimeout(() => {
      void get().saveCurrentNote();
    }, 800);
  },

  togglePin: async (id: string) => {
    const { activeNote } = get();
    let targetNote: GeneralNote | null = null;

    if (activeNote && activeNote.id === id) {
      targetNote = activeNote;
    } else {
      try {
        targetNote = await ipcBridge.readGeneralNote(id);
      } catch (err) {
        console.error(`Failed to read note ${id} for pin toggle:`, err);
        return;
      }
    }

    if (!targetNote) return;

    const nextPinned = !targetNote.pinned;
    const updated: GeneralNote = {
      ...targetNote,
      pinned: nextPinned,
      updatedAt: new Date().toISOString(),
    };

    try {
      await ipcBridge.saveGeneralNote(updated);

      if (activeNote && activeNote.id === id) {
        set({ activeNote: updated });
      }

      // Sync tab pin status if tab is open
      const tabId = `tab_${id}`;
      if (nextPinned) {
        useTabsStore.getState().pinTab(tabId);
      } else {
        useTabsStore.getState().unpinTab(tabId);
      }

      await useWorkspaceStore.getState().refreshNotes();
    } catch (err) {
      console.error(`Failed to toggle pin on note ${id}:`, err);
    }
  },

  moveNoteToSection: async (id: string, section: string) => {
    const { activeNote } = get();
    let targetNote: GeneralNote | null = null;

    if (activeNote && activeNote.id === id) {
      targetNote = activeNote;
    } else {
      try {
        targetNote = await ipcBridge.readGeneralNote(id);
      } catch (err) {
        console.error(`Failed to read note ${id} for section move:`, err);
        return;
      }
    }

    if (!targetNote) return;

    const trimmed = section.trim() || "General";
    const updated: GeneralNote = {
      ...targetNote,
      section: trimmed,
      updatedAt: new Date().toISOString(),
    };

    try {
      await ipcBridge.saveGeneralNote(updated);

      if (activeNote && activeNote.id === id) {
        set({ activeNote: updated });
      }

      await useWorkspaceStore.getState().refreshNotes();
    } catch (err) {
      console.error(`Failed to move note ${id} to section ${section}:`, err);
    }
  },

  setDeleteCandidateId: (id: string | null) => {
    set({ deleteCandidateId: id });
  },

  deleteNote: async (id: string) => {
    const { activeNote } = get();

    try {
      await ipcBridge.moveNoteToBin(id);

      // If active note is the one being deleted, clear it
      if (activeNote?.id === id) {
        set({ activeNote: null, isDirty: false });
      }

      // Close the tab associated with this note
      useTabsStore.getState().closeTab(`tab_${id}`);

      // Refresh workspace notes
      await useWorkspaceStore.getState().refreshNotes();

      // Refresh resource inspector
      void useResourceStore.getState().refresh();

      // Refresh bin list
      await useBinStore.getState().fetchBinnedNotes();

      set({ deleteCandidateId: null });
    } catch (err) {
      console.error(`Failed to move general note ${id} to bin:`, err);
      throw err;
    }
  },

  deleteNotePermanently: async (id: string) => {
    const { activeNote } = get();

    try {
      await ipcBridge.deleteGeneralNote(id);

      if (activeNote?.id === id) {
        set({ activeNote: null, isDirty: false });
      }

      useTabsStore.getState().closeTab(`tab_${id}`);
      await useWorkspaceStore.getState().refreshNotes();
      void useResourceStore.getState().refresh();
      await useBinStore.getState().fetchBinnedNotes();
      set({ deleteCandidateId: null });
    } catch (err) {
      console.error(`Failed to permanently delete general note ${id}:`, err);
      throw err;
    }
  },

  setFilterQuery: (query: string) => {
    set({ filterQuery: query });
  },

  setSelectedTag: (selectedTag: string | null) => {
    set({
      selectedTag,
      selectedTags: selectedTag ? [selectedTag] : [],
    });
  },

  toggleTagFilter: (tag: string) => {
    const { selectedTags } = get();
    const nextTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    set({
      selectedTags: nextTags,
      selectedTag: nextTags[0] ?? null,
    });
  },

  setSelectedTags: (selectedTags: string[]) => {
    set({
      selectedTags,
      selectedTag: selectedTags[0] ?? null,
    });
  },

  clearTagFilters: () => {
    set({
      selectedTags: [],
      selectedTag: null,
    });
  },

  setTagMatchMode: (tagMatchMode: "and" | "or") => {
    set({ tagMatchMode });
  },

  clearActiveNote: () => {
    set({ activeNote: null, isDirty: false });
  },
}));
