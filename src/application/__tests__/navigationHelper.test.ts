import { describe, it, expect, beforeEach, vi } from "vitest";
import { navigateToNoteOrDsm } from "../navigationHelper";
import { useNotesStore } from "../stores/useNotesStore";
import { useTabsStore } from "../stores/useTabsStore";
import { useWorkspaceStore } from "../stores/useWorkspaceStore";
import { useDsmStore } from "../stores/useDsmStore";
import { DSM_TAB_ID } from "@domain/tabs.types";

describe("navigateToNoteOrDsm", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    useTabsStore.getState().resetTabs();
    useNotesStore.getState().clearActiveNote();
    await useWorkspaceStore.getState().createWorkspace("C:/mock/ws", "Mock WS");
    await useDsmStore.getState().loadDsm();
  });

  it("navigates to DSM date entry when target begins with dsm:", async () => {
    const testDate = "2026-09-15";
    useDsmStore.getState().createOrGetEntry(testDate, ["backend"], "Stand-up entry text");

    await navigateToNoteOrDsm(`dsm:${testDate}`);

    expect(useTabsStore.getState().activeTabId).toBe(DSM_TAB_ID);
    expect(useDsmStore.getState().highlightedDate).toBe(testDate);
  });

  it("navigates to existing general note by ID", async () => {
    const note = await useNotesStore.getState().createNote({
      title: "Backend Architecture",
      tags: ["arch"],
    });

    useTabsStore.getState().switchTab(DSM_TAB_ID);
    useNotesStore.getState().clearActiveNote();

    await navigateToNoteOrDsm(note.id);

    expect(useTabsStore.getState().activeTabId).toBe(`tab_${note.id}`);
    expect(useNotesStore.getState().activeNote?.id).toBe(note.id);
  });

  it("navigates to existing general note by title (case-insensitive)", async () => {
    const note = await useNotesStore.getState().createNote({
      title: "Kafka Pipeline Design",
      tags: ["streaming"],
    });

    useTabsStore.getState().switchTab(DSM_TAB_ID);
    useNotesStore.getState().clearActiveNote();

    await navigateToNoteOrDsm("kafka pipeline design");

    expect(useTabsStore.getState().activeTabId).toBe(`tab_${note.id}`);
    expect(useNotesStore.getState().activeNote?.id).toBe(note.id);
  });

  it("creates new note and opens it when target note does not exist", async () => {
    const missingTitle = "Brand New Concept";

    await navigateToNoteOrDsm(missingTitle);

    const activeNote = useNotesStore.getState().activeNote;
    expect(activeNote).toBeDefined();
    expect(activeNote?.title).toBe(missingTitle);
    expect(useTabsStore.getState().activeTabId).toBe(`tab_${activeNote?.id}`);
  });

  it("does nothing for empty or whitespace strings", async () => {
    const initialTabId = useTabsStore.getState().activeTabId;
    await navigateToNoteOrDsm("   ");
    expect(useTabsStore.getState().activeTabId).toBe(initialTabId);
  });
});
