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

  it("pins and unpins general note tabs while keeping DSM pinned permanently", () => {
    useTabsStore.getState().openTab({
      id: "tab_note_1",
      documentId: "not_1",
      documentType: "general",
      title: "Note 1",
    });

    // Pin note 1
    useTabsStore.getState().pinTab("tab_note_1");
    expect(useTabsStore.getState().tabs.find((t) => t.id === "tab_note_1")?.isPinned).toBe(true);

    // Attempting to close pinned note tab is ignored
    useTabsStore.getState().closeTab("tab_note_1");
    expect(useTabsStore.getState().tabs.find((t) => t.id === "tab_note_1")).toBeDefined();

    // Unpin note 1
    useTabsStore.getState().unpinTab("tab_note_1");
    expect(useTabsStore.getState().tabs.find((t) => t.id === "tab_note_1")?.isPinned).toBe(false);

    // Attempting to unpin DSM tab is strictly rejected
    useTabsStore.getState().unpinTab(DSM_TAB_ID);
    expect(useTabsStore.getState().tabs.find((t) => t.id === DSM_TAB_ID)?.isPinned).toBe(true);
  });

  it("closes other tabs while preserving pinned tabs", () => {
    useTabsStore.getState().openTab({
      id: "tab_note_1",
      documentId: "not_1",
      documentType: "general",
      title: "Note 1",
      isPinned: true,
    });
    useTabsStore.getState().openTab({
      id: "tab_note_2",
      documentId: "not_2",
      documentType: "general",
      title: "Note 2",
    });
    useTabsStore.getState().openTab({
      id: "tab_note_3",
      documentId: "not_3",
      documentType: "general",
      title: "Note 3",
    });

    expect(useTabsStore.getState().tabs).toHaveLength(4); // DSM (pinned) + Note 1 (pinned) + Note 2 + Note 3

    // Close others relative to tab_note_2
    useTabsStore.getState().closeOtherTabs("tab_note_2");

    const { tabs } = useTabsStore.getState();
    expect(tabs).toHaveLength(3); // DSM (pinned), Note 1 (pinned), Note 2 (target)
    expect(tabs.map((t) => t.id)).toEqual([DSM_TAB_ID, "tab_note_1", "tab_note_2"]);
  });

  it("closes tabs to the right while preserving pinned tabs", () => {
    useTabsStore.getState().openTab({
      id: "tab_note_1",
      documentId: "not_1",
      documentType: "general",
      title: "Note 1",
    });
    useTabsStore.getState().openTab({
      id: "tab_note_2",
      documentId: "not_2",
      documentType: "general",
      title: "Note 2",
    });
    useTabsStore.getState().openTab({
      id: "tab_note_3",
      documentId: "not_3",
      documentType: "general",
      title: "Note 3",
      isPinned: true,
    });
    useTabsStore.getState().openTab({
      id: "tab_note_4",
      documentId: "not_4",
      documentType: "general",
      title: "Note 4",
    });

    // Close tabs to right of tab_note_1
    useTabsStore.getState().closeTabsToTheRight("tab_note_1");

    const { tabs } = useTabsStore.getState();
    // Expected: DSM, tab_note_1, tab_note_3 (pinned)
    expect(tabs.map((t) => t.id)).toEqual([DSM_TAB_ID, "tab_note_1", "tab_note_3"]);
  });

  it("restores tab session and filters out missing note IDs", () => {
    const wsId = "wsp_test_session";
    useTabsStore.getState().setActiveWorkspaceId(wsId);
    useTabsStore.getState().openTab({
      id: "tab_not_alive",
      documentId: "not_alive",
      documentType: "general",
      title: "Alive Note",
    });
    useTabsStore.getState().openTab({
      id: "tab_not_dead",
      documentId: "not_dead",
      documentType: "general",
      title: "Dead Note",
    });

    // Save session
    useTabsStore.getState().saveSession(wsId);

    // Reset store
    useTabsStore.getState().resetTabs();
    expect(useTabsStore.getState().tabs).toHaveLength(1);

    // Restore session with validNoteIds containing only not_alive
    const validNoteIds = new Set(["not_alive"]);
    useTabsStore.getState().restoreSession(wsId, validNoteIds);

    const { tabs } = useTabsStore.getState();
    expect(tabs).toHaveLength(2); // DSM + not_alive
    expect(tabs.map((t) => t.documentId)).toEqual(["dsm_master", "not_alive"]);
  });
});
