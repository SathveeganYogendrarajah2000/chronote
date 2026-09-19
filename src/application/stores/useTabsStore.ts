import { create } from "zustand";
import {
  type TabItem,
  createDsmTab,
  DSM_TAB_ID,
  DSM_DOCUMENT_ID,
} from "@domain/tabs.types";

export interface OpenTabParams {
  id?: string | undefined;
  documentId: string;
  documentType: "dsm" | "general";
  title: string;
  isPinned?: boolean | undefined;
  scrollPosition?: number | undefined;
}

interface TabsState {
  tabs: TabItem[];
  activeTabId: string;
  closedTabHistory: TabItem[];
  activeWorkspaceId: string | null;

  openTab: (tab: OpenTabParams) => void;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeTabsToTheRight: (tabId: string) => void;
  pinTab: (tabId: string) => void;
  unpinTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  reopenClosedTab: () => void;
  updateTabTitle: (documentId: string, title: string) => void;
  setTabScrollPosition: (tabId: string, scrollPosition: number) => void;
  resetTabs: () => void;
  setActiveWorkspaceId: (workspaceId: string | null) => void;
  saveSession: (workspaceId?: string) => void;
  restoreSession: (workspaceId: string, validNoteIds?: Set<string>) => void;
}

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

const getSessionStorageKey = (workspaceId: string) => `chronote_tabs_${workspaceId}`;

const initialDsmTab = createDsmTab();

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [initialDsmTab],
  activeTabId: DSM_TAB_ID,
  closedTabHistory: [],
  activeWorkspaceId: null,

  setActiveWorkspaceId: (workspaceId: string | null) => {
    set({ activeWorkspaceId: workspaceId });
  },

  openTab: (newTabParams) => {
    const { tabs } = get();
    // Check if a tab for this document is already open
    const existing = tabs.find((t) => t.documentId === newTabParams.documentId);
    if (existing) {
      set({ activeTabId: existing.id });
      get().saveSession();
      return;
    }

    const newTab: TabItem = {
      id: newTabParams.id || `tab_${newTabParams.documentId}`,
      documentId: newTabParams.documentId,
      documentType: newTabParams.documentType,
      title: newTabParams.title,
      isPinned: newTabParams.isPinned ?? false,
      ...(newTabParams.scrollPosition !== undefined ? { scrollPosition: newTabParams.scrollPosition } : {}),
    };

    set({
      tabs: [...tabs, newTab],
      activeTabId: newTab.id,
    });
    get().saveSession();
  },

  closeTab: (tabId: string) => {
    const { tabs, activeTabId, closedTabHistory } = get();
    const targetIndex = tabs.findIndex((t) => t.id === tabId);
    if (targetIndex === -1) return;

    const targetTab = tabs[targetIndex];
    if (!targetTab) return;

    // Never close pinned tabs (e.g. DSM Master Journal or user-pinned notes)
    if (targetTab.isPinned) return;

    const newTabs = tabs.filter((t) => t.id !== tabId);
    let nextActiveId = activeTabId;

    if (activeTabId === tabId) {
      // Switch to previous tab, or next tab if previous not available
      const fallbackTab = tabs[targetIndex - 1] ?? tabs[targetIndex + 1] ?? initialDsmTab;
      nextActiveId = fallbackTab.id;
    }

    // Maintain max 20 items in closed tab history stack
    const updatedHistory = [targetTab, ...closedTabHistory].slice(0, 20);

    set({
      tabs: newTabs,
      activeTabId: nextActiveId,
      closedTabHistory: updatedHistory,
    });
    get().saveSession();
  },

  closeOtherTabs: (tabId: string) => {
    const { tabs, activeTabId, closedTabHistory } = get();
    const tabsToClose = tabs.filter((t) => t.id !== tabId && !t.isPinned);
    if (tabsToClose.length === 0) return;

    const remainingTabs = tabs.filter((t) => t.id === tabId || t.isPinned);
    const isCurrentActiveKept = remainingTabs.some((t) => t.id === activeTabId);
    const nextActiveId = isCurrentActiveKept ? activeTabId : tabId;

    const updatedHistory = [...tabsToClose.reverse(), ...closedTabHistory].slice(0, 20);

    set({
      tabs: remainingTabs,
      activeTabId: nextActiveId,
      closedTabHistory: updatedHistory,
    });
    get().saveSession();
  },

  closeTabsToTheRight: (tabId: string) => {
    const { tabs, activeTabId, closedTabHistory } = get();
    const targetIndex = tabs.findIndex((t) => t.id === tabId);
    if (targetIndex === -1 || targetIndex === tabs.length - 1) return;

    const leftTabs = tabs.slice(0, targetIndex + 1);
    const rightTabs = tabs.slice(targetIndex + 1);
    const tabsToClose = rightTabs.filter((t) => !t.isPinned);
    const tabsToKeep = rightTabs.filter((t) => t.isPinned);

    if (tabsToClose.length === 0) return;

    const newTabs = [...leftTabs, ...tabsToKeep];
    const isCurrentActiveKept = newTabs.some((t) => t.id === activeTabId);
    const nextActiveId = isCurrentActiveKept ? activeTabId : tabId;

    const updatedHistory = [...tabsToClose.reverse(), ...closedTabHistory].slice(0, 20);

    set({
      tabs: newTabs,
      activeTabId: nextActiveId,
      closedTabHistory: updatedHistory,
    });
    get().saveSession();
  },

  pinTab: (tabId: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isPinned: true } : t)),
    }));
    get().saveSession();
  },

  unpinTab: (tabId: string) => {
    // DSM master tab cannot be unpinned
    if (tabId === DSM_TAB_ID) return;

    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isPinned: false } : t)),
    }));
    get().saveSession();
  },

  switchTab: (tabId: string) => {
    const { tabs } = get();
    const exists = tabs.some((t) => t.id === tabId);
    if (exists) {
      set({ activeTabId: tabId });
      get().saveSession();
    }
  },

  reopenClosedTab: () => {
    const { closedTabHistory } = get();
    if (closedTabHistory.length === 0) return;

    const [tabToReopen, ...restHistory] = closedTabHistory;
    if (!tabToReopen) return;

    set({ closedTabHistory: restHistory });
    get().openTab(tabToReopen);
  },

  updateTabTitle: (documentId: string, title: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.documentId === documentId ? { ...t, title } : t
      ),
    }));
    get().saveSession();
  },

  setTabScrollPosition: (tabId: string, scrollPosition: number) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, scrollPosition } : t
      ),
    }));
  },

  resetTabs: () => {
    set({
      tabs: [createDsmTab()],
      activeTabId: DSM_TAB_ID,
      closedTabHistory: [],
    });
  },

  saveSession: (workspaceId?: string) => {
    const targetWsId = workspaceId ?? get().activeWorkspaceId;
    if (!targetWsId) return;

    try {
      const storage = getLocalStorage();
      const { tabs, activeTabId } = get();
      const sessionData = {
        tabs: tabs.map((t) => ({
          id: t.id,
          documentId: t.documentId,
          documentType: t.documentType,
          title: t.title,
          isPinned: t.isPinned,
          scrollPosition: t.scrollPosition,
        })),
        activeTabId,
      };
      storage?.setItem(getSessionStorageKey(targetWsId), JSON.stringify(sessionData));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  },

  restoreSession: (workspaceId: string, validNoteIds?: Set<string>) => {
    set({ activeWorkspaceId: workspaceId });
    try {
      const storage = getLocalStorage();
      const raw = storage?.getItem(getSessionStorageKey(workspaceId));
      if (!raw) {
        // No saved session: keep default DSM tab
        set({ tabs: [createDsmTab()], activeTabId: DSM_TAB_ID });
        return;
      }

      const session = JSON.parse(raw) as { tabs?: TabItem[]; activeTabId?: string };
      if (!session || !Array.isArray(session.tabs) || session.tabs.length === 0) {
        set({ tabs: [createDsmTab()], activeTabId: DSM_TAB_ID });
        return;
      }

      // Filter tabs: always keep DSM tab, and keep general note tabs only if validNoteIds is not provided or contains the note ID
      const filteredTabs: TabItem[] = [];
      let dsmFound = false;

      for (const tab of session.tabs) {
        if (tab.documentType === "dsm" || tab.documentId === DSM_DOCUMENT_ID) {
          filteredTabs.push({ ...createDsmTab(), isPinned: true });
          dsmFound = true;
        } else if (tab.documentType === "general") {
          if (!validNoteIds || validNoteIds.has(tab.documentId)) {
            filteredTabs.push({
              id: tab.id || `tab_${tab.documentId}`,
              documentId: tab.documentId,
              documentType: "general",
              title: tab.title || "Untitled Note",
              isPinned: tab.isPinned ?? false,
              ...(tab.scrollPosition !== undefined ? { scrollPosition: tab.scrollPosition } : {}),
            });
          }
        }
      }

      if (!dsmFound) {
        filteredTabs.unshift(createDsmTab());
      }

      const targetActiveId = session.activeTabId && filteredTabs.some((t) => t.id === session.activeTabId)
        ? session.activeTabId
        : (filteredTabs[0]?.id ?? DSM_TAB_ID);

      set({
        tabs: filteredTabs,
        activeTabId: targetActiveId,
      });
    } catch {
      set({ tabs: [createDsmTab()], activeTabId: DSM_TAB_ID });
    }
  },
}));
