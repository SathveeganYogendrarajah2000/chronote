import { create } from "zustand";
import type { Workspace, WorkspaceSettings } from "@domain/workspace.types";
import type { NoteMetadata } from "@domain/note.types";
import { ipcBridge, type IndexStats } from "@infrastructure/tauri/ipcBridge";

export interface RecentWorkspaceItem {
  path: string;
  name: string;
  lastOpened: string;
}

const STORAGE_KEY_RECENT_WORKSPACES = "chronote_recent_workspaces";
const STORAGE_KEY_LAST_WORKSPACE = "chronote_last_workspace_path";

function getLocalStorage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
  } catch {
    return null;
  }
  return null;
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
        set({ workspace: active, isLoading: false, isWorkspaceModalOpen: false });
        await get().refreshNotes();
        return;
      }

      // 2. Otherwise, check localStorage for last opened workspace
      const storage = getLocalStorage();
      const lastPath = storage?.getItem(STORAGE_KEY_LAST_WORKSPACE);
      if (lastPath) {
        try {
          const ws = await ipcBridge.openWorkspace(lastPath);
          set({ workspace: ws, isLoading: false, isWorkspaceModalOpen: false });
          await get().refreshNotes();
          return;
        } catch {
          // Fall back to opening modal if last workspace cannot be opened
          storage?.removeItem(STORAGE_KEY_LAST_WORKSPACE);
        }
      }

      // 3. No active workspace; show the workspace selector modal
      set({ workspace: null, isLoading: false, isWorkspaceModalOpen: true });
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
    } catch (err) {
      console.error("Failed to refresh notes:", err);
    }
  },

  deleteNote: async (id: string) => {
    try {
      await ipcBridge.deleteGeneralNote(id);
      await get().refreshNotes();
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

  setWorkspaceModalOpen: (open: boolean) => set({ isWorkspaceModalOpen: open }),
  setError: (error: string | null) => set({ error }),
}));
