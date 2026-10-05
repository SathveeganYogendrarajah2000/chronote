import { create } from "zustand";
import type { BinnedNoteRecord } from "@domain/bin.types";
import type { GeneralNote } from "@domain/note.types";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";
import { useWorkspaceStore } from "./useWorkspaceStore";
import { useTabsStore } from "./useTabsStore";
import { useResourceStore } from "./useResourceStore";

interface BinState {
  binnedNotes: BinnedNoteRecord[];
  isLoading: boolean;
  isBinModalOpen: boolean;
  previewNote: BinnedNoteRecord | null;

  loadBinnedNotes: () => Promise<void>;
  fetchBinnedNotes: () => Promise<void>;
  moveToBin: (id: string) => Promise<BinnedNoteRecord>;
  restoreNote: (id: string) => Promise<GeneralNote>;
  deletePermanently: (id: string) => Promise<void>;
  emptyBin: () => Promise<void>;
  openBinModal: () => void;
  closeBinModal: () => void;
  setPreviewNote: (note: BinnedNoteRecord | null) => void;
}

export const useBinStore = create<BinState>((set, get) => ({
  binnedNotes: [],
  isLoading: false,
  isBinModalOpen: false,
  previewNote: null,

  fetchBinnedNotes: async () => {
    set({ isLoading: true });
    try {
      const binnedNotes = await ipcBridge.listBinnedNotes();
      set({ binnedNotes, isLoading: false });
    } catch (err) {
      console.error("Failed to fetch binned notes:", err);
      set({ isLoading: false });
    }
  },

  loadBinnedNotes: async () => {
    await get().fetchBinnedNotes();
  },

  moveToBin: async (id: string) => {
    try {
      const binnedRecord = await ipcBridge.moveNoteToBin(id);

      if (id.startsWith("ent_")) {
        const { useDsmStore } = await import("./useDsmStore");
        await useDsmStore.getState().loadDsm();
      } else {
        // Close the tab associated with this note
        useTabsStore.getState().closeTab(`tab_${id}`);

        // Refresh workspace notes list
        await useWorkspaceStore.getState().refreshNotes();
      }

      // Refresh resource inspector
      void useResourceStore.getState().refresh();

      // Refresh bin list
      await get().fetchBinnedNotes();

      return binnedRecord;
    } catch (err) {
      console.error(`Failed to move note ${id} to bin:`, err);
      throw err;
    }
  },

  restoreNote: async (id: string) => {
    try {
      const restored = await ipcBridge.restoreNoteFromBin(id);

      if (id.startsWith("ent_") || restored.id.startsWith("ent_")) {
        const { useDsmStore } = await import("./useDsmStore");
        await useDsmStore.getState().loadDsm();
        useTabsStore.getState().switchTab("tab_dsm_master");
      } else {
        // Refresh workspace notes so restored note shows up in sidebar
        await useWorkspaceStore.getState().refreshNotes();

        // Open tab for restored note
        useTabsStore.getState().openTab({
          id: `tab_${restored.id}`,
          documentId: restored.id,
          documentType: "general",
          title: restored.title,
          isPinned: restored.pinned,
        });
      }

      // Refresh resource inspector
      void useResourceStore.getState().refresh();

      // Refresh bin list
      await get().fetchBinnedNotes();

      // If this note was in preview, clear preview
      if (get().previewNote?.id === id) {
        set({ previewNote: null });
      }

      return restored;
    } catch (err) {
      console.error(`Failed to restore note ${id} from bin:`, err);
      throw err;
    }
  },

  deletePermanently: async (id: string) => {
    try {
      await ipcBridge.deleteBinnedNotePermanently(id);

      if (get().previewNote?.id === id) {
        set({ previewNote: null });
      }

      await get().fetchBinnedNotes();
    } catch (err) {
      console.error(`Failed to permanently delete note ${id}:`, err);
      throw err;
    }
  },

  emptyBin: async () => {
    try {
      await ipcBridge.emptyBin();
      set({ binnedNotes: [], previewNote: null });
    } catch (err) {
      console.error("Failed to empty bin:", err);
      throw err;
    }
  },

  openBinModal: () => {
    void get().fetchBinnedNotes();
    set({ isBinModalOpen: true });
  },

  closeBinModal: () => {
    set({ isBinModalOpen: false, previewNote: null });
  },

  setPreviewNote: (previewNote) => {
    set({ previewNote });
  },
}));
