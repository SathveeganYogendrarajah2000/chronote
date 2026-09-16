import { describe, it, expect, beforeEach } from "vitest";
import { useTabsStore } from "../stores/useTabsStore";
import { DSM_TAB_ID } from "@domain/tabs.types";

describe("useTabsStore", () => {
  beforeEach(() => {
    useTabsStore.getState().resetTabs();
  });

  it("initializes with the pinned DSM tab active", () => {
    const { tabs, activeTabId } = useTabsStore.getState();
    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.id).toBe(DSM_TAB_ID);
    expect(tabs[0]?.isPinned).toBe(true);
    expect(activeTabId).toBe(DSM_TAB_ID);
  });

  it("opens a new note tab and marks it active", () => {
    useTabsStore.getState().openTab({
      id: "tab_note_1",
      documentId: "not_01JC87XK89",
      documentType: "general",
      title: "Spring Security",
    });

    const { tabs, activeTabId } = useTabsStore.getState();
    expect(tabs).toHaveLength(2);
    expect(activeTabId).toBe("tab_note_1");
  });

  it("focuses existing tab if already open instead of duplicating", () => {
    useTabsStore.getState().openTab({
      id: "tab_note_1",
      documentId: "not_01JC87XK89",
      documentType: "general",
      title: "Spring Security",
    });

    useTabsStore.getState().openTab({
      id: "tab_note_2",
      documentId: "not_01JC87Y11Z",
      documentType: "general",
      title: "MongoDB",
    });

    expect(useTabsStore.getState().activeTabId).toBe("tab_note_2");

    // Open first note again
    useTabsStore.getState().openTab({
      documentId: "not_01JC87XK89",
      documentType: "general",
      title: "Spring Security",
    });

    const { tabs, activeTabId } = useTabsStore.getState();
    expect(tabs).toHaveLength(3); // DSM + 2 notes
    expect(activeTabId).toBe("tab_note_1");
  });

  it("prevents closing pinned tabs", () => {
    useTabsStore.getState().closeTab(DSM_TAB_ID);
    const { tabs } = useTabsStore.getState();
    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.id).toBe(DSM_TAB_ID);
  });

  it("switches to adjacent tab when closing active tab and records history", () => {
    useTabsStore.getState().openTab({
      id: "tab_note_1",
      documentId: "not_01JC87XK89",
      documentType: "general",
      title: "Spring Security",
    });

    useTabsStore.getState().openTab({
      id: "tab_note_2",
      documentId: "not_01JC87Y11Z",
      documentType: "general",
      title: "MongoDB",
    });

    expect(useTabsStore.getState().activeTabId).toBe("tab_note_2");

    // Close active tab
    useTabsStore.getState().closeTab("tab_note_2");

    const { tabs, activeTabId, closedTabHistory } = useTabsStore.getState();
    expect(tabs).toHaveLength(2);
    expect(activeTabId).toBe("tab_note_1");
    expect(closedTabHistory).toHaveLength(1);
    expect(closedTabHistory[0]?.id).toBe("tab_note_2");
  });

  it("reopens recently closed tab from history stack", () => {
    useTabsStore.getState().openTab({
      id: "tab_note_1",
      documentId: "not_01JC87XK89",
      documentType: "general",
      title: "Spring Security",
    });

    useTabsStore.getState().closeTab("tab_note_1");
    expect(useTabsStore.getState().tabs).toHaveLength(1);

    useTabsStore.getState().reopenClosedTab();
    const { tabs, activeTabId, closedTabHistory } = useTabsStore.getState();
    expect(tabs).toHaveLength(2);
    expect(activeTabId).toBe("tab_note_1");
    expect(closedTabHistory).toHaveLength(0);
  });
});
