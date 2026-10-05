import { create } from "zustand";
import type {
  ResourceReference,
  BacklinkReference,
  ResourceType,
  ResourceScope,
} from "@domain/resource.types";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";
import { useDsmStore } from "./useDsmStore";

export type ResourceNavigator = (item: ResourceReference) => boolean;

const resourceNavigators = new Map<string, ResourceNavigator>();

interface ResourceState {
  activeTab: ResourceType;
  scope: ResourceScope;
  filterQuery: string;
  resources: ResourceReference[];
  backlinks: BacklinkReference[];
  isLoading: boolean;
  error: string | null;
  pendingResourceJump: ResourceReference | null;

  setActiveTab: (tab: ResourceType) => void;
  setScope: (scope: ResourceScope, currentDocId?: string) => void;
  setFilterQuery: (query: string) => void;
  loadResources: (currentDocId?: string) => Promise<void>;
  loadBacklinks: (targetNoteId: string) => Promise<void>;
  refresh: (currentDocId?: string) => Promise<void>;
  setPendingResourceJump: (item: ResourceReference | null) => void;
  registerEditorResourceNavigator: (
    contextKey: string,
    navigator: ResourceNavigator
  ) => () => void;
  scrollToResource: (item: ResourceReference) => void;
}

export const useResourceStore = create<ResourceState>((set, get) => ({
  activeTab: "code",
  scope: "activeDoc",
  filterQuery: "",
  resources: [],
  backlinks: [],
  isLoading: false,
  error: null,
  pendingResourceJump: null,

  setActiveTab: (activeTab: ResourceType) => set({ activeTab }),

  setScope: (scope: ResourceScope, currentDocId?: string) => {
    set({ scope });
    void get().refresh(currentDocId);
  },

  setFilterQuery: (filterQuery: string) => set({ filterQuery }),

  setPendingResourceJump: (pendingResourceJump) => set({ pendingResourceJump }),

  registerEditorResourceNavigator: (contextKey: string, navigator: ResourceNavigator) => {
    resourceNavigators.set(contextKey, navigator);
    return () => {
      if (resourceNavigators.get(contextKey) === navigator) {
        resourceNavigators.delete(contextKey);
      }
    };
  },

  scrollToResource: (item: ResourceReference) => {
    // 1. If target is in DSM, make sure entry date is expanded
    if (item.parentDocumentType === "dsm" && item.entryDate) {
      const dsmStore = useDsmStore.getState();
      const entry = dsmStore.dsmDoc?.entries.find((e) => e.date === item.entryDate);
      if (entry && entry.collapsed) {
        dsmStore.toggleEntryCollapse(entry.id);
      }
    }

    set({ pendingResourceJump: item });

    const contextKey =
      item.parentDocumentType === "dsm" && item.entryDate
        ? `dsm_${item.entryDate}`
        : `general_${item.parentDocumentId}`;

    const executeNavigation = () => {
      let navigated = false;
      const nav = resourceNavigators.get(contextKey);
      if (nav) {
        navigated = nav(item);
      }
      if (!navigated && resourceNavigators.size > 0) {
        for (const [key, n] of resourceNavigators.entries()) {
          if (
            key === contextKey ||
            key === item.parentDocumentId ||
            key.includes(item.parentDocumentId)
          ) {
            if (n(item)) {
              navigated = true;
              break;
            }
          }
        }
      }

      if (typeof document === "undefined") return;

      // Pulse animation & DOM scroll fallback
      let targetEl: HTMLElement | null = null;
      if (item.blockId && !item.blockId.startsWith("blk_gen_")) {
        targetEl =
          document.querySelector(`[data-block-id="${item.blockId}"]`) ||
          document.getElementById(item.blockId);
      }

      if (!targetEl && item.targetUrl) {
        targetEl = document.querySelector(
          `[href="${item.targetUrl}"], [data-file-path="${item.targetUrl}"], [data-asset-src*="${item.targetUrl}"], img[src*="${item.targetUrl}"]`
        );
      }

      if (!targetEl && item.blockId && item.blockId.startsWith("blk_gen_")) {
        const idx = parseInt(item.blockId.replace("blk_gen_", ""), 10);
        const containerSelector =
          item.parentDocumentType === "dsm" && item.entryDate
            ? `#dsm-entry-${item.entryDate} .ProseMirror`
            : ".note-canvas-container .ProseMirror";
        const container = document.querySelector(containerSelector);
        if (container && container.children && container.children[idx]) {
          targetEl = container.children[idx] as HTMLElement;
        }
      }

      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });

        // If editor navigator wasn't registered, place DOM selection
        if (!navigated) {
          try {
            const editorEl = targetEl.closest(".ProseMirror") as HTMLElement | null;
            editorEl?.focus();
            const sel = window.getSelection();
            if (sel) {
              const range = document.createRange();
              const textNode = targetEl.firstChild || targetEl;
              range.setStart(textNode, 0);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          } catch {}
        }

        // Pulse highlight animation
        targetEl.classList.remove("block-highlight-pulse");
        void targetEl.offsetWidth;
        targetEl.classList.add("block-highlight-pulse");
        setTimeout(() => targetEl?.classList.remove("block-highlight-pulse"), 2600);
      }
    };

    setTimeout(executeNavigation, 70);
    setTimeout(executeNavigation, 250);
  },

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
