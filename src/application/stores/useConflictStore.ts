import { create } from "zustand";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";
import type { SyncConflictInfo } from "@infrastructure/tauri/ipcBridge";

interface ConflictState {
  conflicts: SyncConflictInfo[];
  activeConflict: SyncConflictInfo | null;
  isScanning: boolean;
  isConflictModalOpen: boolean;

  scanConflicts: () => Promise<void>;
  resolveConflict: (
    conflictFilePath: string,
    resolution: "keep_local" | "use_conflicted" | "keep_both"
  ) => Promise<void>;
  setActiveConflict: (conflict: SyncConflictInfo | null) => void;
  setConflictModalOpen: (open: boolean) => void;
}

export const useConflictStore = create<ConflictState>((set, get) => ({
  conflicts: [],
  activeConflict: null,
  isScanning: false,
  isConflictModalOpen: false,

  scanConflicts: async () => {
    set({ isScanning: true });
    try {
      const conflicts = await ipcBridge.getSyncConflicts();
      set({
        conflicts,
        isScanning: false,
        activeConflict: conflicts.length > 0 ? (get().activeConflict || conflicts[0]) : null,
      });
    } catch (err) {
      console.error("Failed to scan sync conflicts:", err);
      set({ isScanning: false });
    }
  },

  resolveConflict: async (conflictFilePath, resolution) => {
    try {
      await ipcBridge.resolveConflict(conflictFilePath, resolution);
      const remaining = get().conflicts.filter((c) => c.conflictFilePath !== conflictFilePath);
      set({
        conflicts: remaining,
        activeConflict: remaining.length > 0 ? remaining[0] : null,
        isConflictModalOpen: remaining.length > 0,
      });
    } catch (err) {
      console.error("Failed to resolve conflict:", err);
    }
  },

  setActiveConflict: (conflict) => set({ activeConflict: conflict }),
  setConflictModalOpen: (open) => set({ isConflictModalOpen: open }),
}));
