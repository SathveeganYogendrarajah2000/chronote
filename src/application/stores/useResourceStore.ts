import { create } from "zustand";
import type {
  ResourceReference,
  BacklinkReference,
  ResourceType,
  ResourceScope,
} from "@domain/resource.types";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";

interface ResourceState {
  activeTab: ResourceType;
  scope: ResourceScope;
  filterQuery: string;
  resources: ResourceReference[];
  backlinks: BacklinkReference[];
  isLoading: boolean;
  error: string | null;

  setActiveTab: (tab: ResourceType) => void;
  setScope: (scope: ResourceScope, currentDocId?: string) => void;
  setFilterQuery: (query: string) => void;
  loadResources: (currentDocId?: string) => Promise<void>;
  loadBacklinks: (targetNoteId: string) => Promise<void>;
  refresh: (currentDocId?: string) => Promise<void>;
}

export const useResourceStore = create<ResourceState>((set, get) => ({
  activeTab: "code",
  scope: "activeDoc",
  filterQuery: "",
  resources: [],
  backlinks: [],
  isLoading: false,
  error: null,

  setActiveTab: (activeTab: ResourceType) => set({ activeTab }),

  setScope: (scope: ResourceScope, currentDocId?: string) => {
    set({ scope });
    void get().refresh(currentDocId);
  },

  setFilterQuery: (filterQuery: string) => set({ filterQuery }),

  loadResources: async (currentDocId?: string) => {
    const { scope } = get();
    set({ isLoading: true, error: null });

    try {
      const options =
        scope === "activeDoc" && currentDocId
          ? { documentId: currentDocId }
          : undefined;
      const resources = await ipcBridge.getResources(options);
      set({ resources, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  loadBacklinks: async (targetNoteId: string) => {
    if (!targetNoteId) {
      set({ backlinks: [] });
      return;
    }

    try {
      const backlinks = await ipcBridge.getBacklinks(targetNoteId);
      set({ backlinks });
    } catch (err) {
      console.error("Failed to load backlinks:", err);
      set({ backlinks: [] });
    }
  },

  refresh: async (currentDocId?: string) => {
    await get().loadResources(currentDocId);
    if (currentDocId && currentDocId !== "dsm_master") {
      await get().loadBacklinks(currentDocId);
    } else {
      set({ backlinks: [] });
    }
  },
}));
