import { create } from "zustand";
import {
  type TabItem,
  createDsmTab,
  DSM_TAB_ID,
} from "@domain/tabs.types";

export interface OpenTabParams {
  id?: string;
  documentId: string;
  documentType: "dsm" | "general";
  title: string;
  isPinned?: boolean;
  scrollPosition?: number | undefined;
}

interface TabsState {
  tabs: TabItem[];
  activeTabId: string;
  closedTabHistory: TabItem[];

  openTab: (tab: OpenTabParams) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  reopenClosedTab: () => void;
  updateTabTitle: (documentId: string, title: string) => void;
  setTabScrollPosition: (tabId: string, scrollPosition: number) => void;
  resetTabs: () => void;
}

const initialDsmTab = createDsmTab();

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [initialDsmTab],
  activeTabId: DSM_TAB_ID,
  closedTabHistory: [],

  openTab: (newTabParams) => {
    const { tabs } = get();
    // Check if a tab for this document is already open
    const existing = tabs.find((t) => t.documentId === newTabParams.documentId);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }

    const newTab: TabItem = {
      id: newTabParams.id || `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
  },

  closeTab: (tabId: string) => {
    const { tabs, activeTabId, closedTabHistory } = get();
    const targetIndex = tabs.findIndex((t) => t.id === tabId);
    if (targetIndex === -1) return;

    const targetTab = tabs[targetIndex];
    if (!targetTab) return;

    // Never close pinned tabs (e.g. DSM Master Journal)
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
  },

  switchTab: (tabId: string) => {
    const { tabs } = get();
    const exists = tabs.some((t) => t.id === tabId);
    if (exists) {
      set({ activeTabId: tabId });
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
}));
