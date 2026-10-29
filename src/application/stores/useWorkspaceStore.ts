import { create } from "zustand";
import type { Workspace, WorkspaceSettings } from "@domain/workspace.types";
import type { NoteMetadata } from "@domain/note.types";
import { ipcBridge, type IndexStats } from "@infrastructure/tauri/ipcBridge";
import { useDsmStore } from "./useDsmStore";
import { useTabsStore } from "./useTabsStore";
import { useCoursesStore } from "./useCoursesStore";
import { useBinStore } from "./useBinStore";

export interface RecentWorkspaceItem {
  path: string;
  name: string;
  lastOpened: string;
}

const STORAGE_KEY_RECENT_WORKSPACES = "chronote_recent_workspaces";
const STORAGE_KEY_LAST_WORKSPACE = "chronote_last_workspace_path";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number { return this.map.size; }
  clear(): void { this.map.clear(); }
  getItem(key: string): string | null { return this.map.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.map.keys())[index] ?? null; }
  removeItem(key: string): void { this.map.delete(key); }
  setItem(key: string, value: string): void { this.map.set(key, value); }
}

const memoryStorage = new MemoryStorage();

function getLocalStorage(): Storage {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.getItem("__test__");
      return localStorage;
    }
  } catch {
    return memoryStorage;
  }
  return memoryStorage;
}

function loadRecentWorkspaces(): RecentWorkspaceItem[] {
  try {
    const storage = getLocalStorage();
    const raw = storage?.getItem(STORAGE_KEY_RECENT_WORKSPACES);
    if (!raw) return [];
    return JSON.parse(raw) as RecentWorkspaceItem[];
  } catch {
    return [];
  }
}

function saveRecentWorkspaces(items: RecentWorkspaceItem[]): void {
  try {
    const storage = getLocalStorage();
    storage?.setItem(STORAGE_KEY_RECENT_WORKSPACES, JSON.stringify(items.slice(0, 10)));
  } catch {
    // Ignore storage failure in restricted contexts
  }
}

interface WorkspaceState {
  workspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  recentNotes: NoteMetadata[];
  recentWorkspaces: RecentWorkspaceItem[];
  isWorkspaceModalOpen: boolean;

  // Actions
  init: () => Promise<void>;
  createWorkspace: (path: string, name: string) => Promise<Workspace>;
  openWorkspace: (path: string) => Promise<Workspace>;
  pickDirectory: () => Promise<string | null>;
  refreshNotes: () => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  rebuildIndex: () => Promise<IndexStats>;
  updateSettings: (settings: Partial<WorkspaceSettings>) => Promise<void>;
  createSection: (sectionName: string) => Promise<void>;
  deleteSection: (sectionName: string) => Promise<void>;
  togglePinSection: (sectionName: string) => Promise<void>;
  setNoteSortBy: (sortBy: "title" | "updatedAt") => Promise<void>;
  setWorkspaceModalOpen: (open: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  isLoading: false,
  error: null,
  recentNotes: [],
  recentWorkspaces: loadRecentWorkspaces(),
  isWorkspaceModalOpen: false,

  init: async () => {
    set({ isLoading: true, error: null });
    try {
      // 1. Check if backend already has an active workspace open
      const active = await ipcBridge.getActiveWorkspace();
      if (active) {
        set({ workspace: active, isLoading: false });
        await get().refreshNotes();
        const validNoteIds = new Set(get().recentNotes.map((n) => n.id));
        useTabsStore.getState().restoreSession(active.id, validNoteIds);
        return;
      }

      // 2. Check localStorage for last workspace path
      const storage = getLocalStorage();
      const lastPath = storage?.getItem(STORAGE_KEY_LAST_WORKSPACE);
      if (lastPath) {
        try {
          const workspace = await ipcBridge.openWorkspace(lastPath);
          set({ workspace, isLoading: false });
          await get().refreshNotes();
          const validNoteIds = new Set(get().recentNotes.map((n) => n.id));
          useTabsStore.getState().restoreSession(workspace.id, validNoteIds);
          return;
        } catch {
          // If last workspace cannot be opened, proceed to auto-open picker
        }
      }

      // 3. Fallback: prompt directory picker on first launch
      set({ isLoading: false, isWorkspaceModalOpen: true });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
        isWorkspaceModalOpen: true,
      });
    }
  },

  createWorkspace: async (path: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const workspace = await ipcBridge.createWorkspace(path, name);
      const storage = getLocalStorage();
      storage?.setItem(STORAGE_KEY_LAST_WORKSPACE, workspace.path);

      const updatedRecents = [
        { path: workspace.path, name: workspace.name, lastOpened: new Date().toISOString() },
        ...get().recentWorkspaces.filter((r) => r.path !== workspace.path),
      ];
      saveRecentWorkspaces(updatedRecents);

      set({
        workspace,
        isLoading: false,
        isWorkspaceModalOpen: false,
        recentWorkspaces: updatedRecents,
      });
      await get().refreshNotes();
      useTabsStore.getState().resetTabs();
      useTabsStore.getState().setActiveWorkspaceId(workspace.id);
      return workspace;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isLoading: false, error: msg });
      throw new Error(msg);
    }
  },

  openWorkspace: async (path: string) => {
    set({ isLoading: true, error: null });
    try {
      const workspace = await ipcBridge.openWorkspace(path);
      const storage = getLocalStorage();
      storage?.setItem(STORAGE_KEY_LAST_WORKSPACE, workspace.path);

      const updatedRecents = [
        { path: workspace.path, name: workspace.name, lastOpened: new Date().toISOString() },
        ...get().recentWorkspaces.filter((r) => r.path !== workspace.path),
      ];
      saveRecentWorkspaces(updatedRecents);

      set({
        workspace,
        isLoading: false,
        isWorkspaceModalOpen: false,
        recentWorkspaces: updatedRecents,
      });
      await get().refreshNotes();
      const validNoteIds = new Set(get().recentNotes.map((n) => n.id));
      useTabsStore.getState().restoreSession(workspace.id, validNoteIds);
      return workspace;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isLoading: false, error: msg });
      throw new Error(msg);
    }
  },

  pickDirectory: async () => {
    return await ipcBridge.pickWorkspaceDirectory();
  },

  refreshNotes: async () => {
    try {
      const notes = await ipcBridge.listGeneralNotes();
      set({ recentNotes: notes });
      await Promise.all([
        useDsmStore.getState().loadDsm(),
        useCoursesStore.getState().loadCourses(),
      ]);
      void useBinStore.getState().fetchBinnedNotes();
    } catch (err) {
      console.error("Failed to refresh notes:", err);
    }
  },

  deleteNote: async (id: string) => {
    try {
      await ipcBridge.moveNoteToBin(id);
      await get().refreshNotes();
      void useBinStore.getState().fetchBinnedNotes();
    } catch (err) {
      console.error("Failed to delete note:", err);
      throw err;
    }
  },

  rebuildIndex: async () => {
    try {
      const stats = await ipcBridge.rebuildIndex();
      await get().refreshNotes();
      return stats;
    } catch (err) {
      console.error("Failed to rebuild index:", err);
      throw err;
    }
  },

  updateSettings: async (partialSettings: Partial<WorkspaceSettings>) => {
    const { workspace } = get();
    if (!workspace) return;
    const newSettings: WorkspaceSettings = {
      ...workspace.settings,
      ...partialSettings,
    };
    try {
      const updated = await ipcBridge.saveWorkspaceSettings(newSettings);
      set({ workspace: updated });
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  },

  createSection: async (sectionName: string) => {
    const trimmed = sectionName.trim();
    if (!trimmed || trimmed.toLowerCase() === "general") return;
    const { workspace } = get();
    if (!workspace) return;
    const current = workspace.settings.customSections || [];
    if (current.includes(trimmed)) return;
    await get().updateSettings({
      customSections: [...current, trimmed],
    });
  },

  deleteSection: async (sectionName: string) => {
    const trimmed = sectionName.trim();
    if (!trimmed || trimmed.toLowerCase() === "general") return;
    const { workspace, recentNotes } = get();
    if (!workspace) return;

    // Move any notes in this section to "General"
    const notesToMove = recentNotes.filter((n) => (n.section || "General") === trimmed);
    for (const noteMeta of notesToMove) {
      try {
        const fullNote = await ipcBridge.readGeneralNote(noteMeta.id);
        await ipcBridge.saveGeneralNote({
          ...fullNote,
          section: "General",
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`Failed to move note ${noteMeta.id} from deleted section:`, err);
      }
    }

    const currentCustom = workspace.settings.customSections || [];
    const currentPinned = workspace.settings.pinnedSections || [];

    await get().updateSettings({
      customSections: currentCustom.filter((s) => s !== trimmed),
      pinnedSections: currentPinned.filter((s) => s !== trimmed),
    });

    await get().refreshNotes();
  },

  togglePinSection: async (sectionName: string) => {
    const trimmed = sectionName.trim();
    if (!trimmed) return;
    const { workspace } = get();
    if (!workspace) return;

    const currentPinned = workspace.settings.pinnedSections || [];
    const isAlreadyPinned = currentPinned.includes(trimmed);

    const nextPinned = isAlreadyPinned
      ? currentPinned.filter((s) => s !== trimmed)
      : [...currentPinned, trimmed];

    await get().updateSettings({
      pinnedSections: nextPinned,
    });
  },

  setNoteSortBy: async (sortBy: "title" | "updatedAt") => {
    await get().updateSettings({
      noteSortBy: sortBy,
    });
  },

  setWorkspaceModalOpen: (open: boolean) => set({ isWorkspaceModalOpen: open }),
  setError: (error: string | null) => set({ error }),
}));
