import { create } from "zustand";
import type { Workspace, WorkspaceSettings } from "@domain/workspace.types";
import type { NoteMetadata } from "@domain/note.types";

interface WorkspaceState {
  workspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  recentNotes: NoteMetadata[];
  setWorkspace: (workspace: Workspace) => void;
  clearWorkspace: () => void;
  setRecentNotes: (notes: NoteMetadata[]) => void;
  updateSettings: (settings: Partial<WorkspaceSettings>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspace: null,
  isLoading: false,
  error: null,
  recentNotes: [],

  setWorkspace: (workspace) => set({ workspace, error: null }),
  clearWorkspace: () => set({ workspace: null, recentNotes: [] }),
  setRecentNotes: (recentNotes) => set({ recentNotes }),

  updateSettings: (partialSettings) =>
    set((state) => {
      if (!state.workspace) return state;
      return {
        workspace: {
          ...state.workspace,
          settings: {
            ...state.workspace.settings,
            ...partialSettings,
          },
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
