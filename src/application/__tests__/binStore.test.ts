import { describe, it, expect, beforeEach } from "vitest";
import { useBinStore } from "../stores/useBinStore";
import { useNotesStore } from "../stores/useNotesStore";
import { useTabsStore } from "../stores/useTabsStore";
import { useWorkspaceStore } from "../stores/useWorkspaceStore";
import { mockIpcBridge } from "@infrastructure/tauri/mockIpcBridge";

describe("useBinStore", () => {
  beforeEach(async () => {
    mockIpcBridge.reset();
    useTabsStore.getState().resetTabs();
    useNotesStore.getState().clearActiveNote();
    await useWorkspaceStore.getState().createWorkspace("C:/mock/ws", "Mock WS");
    await useBinStore.getState().fetchBinnedNotes();
  });

  it("moves a note to the bin, closes its tab, and refreshes notes and bin", async () => {
    const note = await useNotesStore.getState().createNote({
      title: "Note to Trash",
      tags: ["scratch"],
    });

    expect(useWorkspaceStore.getState().recentNotes.length).toBe(1);
    expect(useTabsStore.getState().tabs.some((t) => t.documentId === note.id)).toBe(true);

    // Delete note (moves to bin)
    await useNotesStore.getState().deleteNote(note.id);

    // Active note cleared and tab closed
    expect(useNotesStore.getState().activeNote).toBeNull();
    expect(useTabsStore.getState().tabs.some((t) => t.documentId === note.id)).toBe(false);

    // Workspace notes empty
    expect(useWorkspaceStore.getState().recentNotes.length).toBe(0);

    // Bin contains the note
    const binned = useBinStore.getState().binnedNotes;
    expect(binned.length).toBe(1);
    expect(binned[0].id).toBe(note.id);
    expect(binned[0].title).toBe("Note to Trash");
  });

  it("restores a note from the bin back to workspace notes and opens a tab", async () => {
    const note = await useNotesStore.getState().createNote({
      title: "Resurrected Note",
    });

    await useNotesStore.getState().deleteNote(note.id);
    expect(useBinStore.getState().binnedNotes.length).toBe(1);

    // Restore
    const restored = await useBinStore.getState().restoreNote(note.id);
    expect(restored.id).toBe(note.id);
    expect(restored.title).toBe("Resurrected Note");

    // Bin should now be empty
    expect(useBinStore.getState().binnedNotes.length).toBe(0);

    // Note should be back in workspace notes and have an open tab
    expect(useWorkspaceStore.getState().recentNotes.length).toBe(1);
    expect(useTabsStore.getState().tabs.some((t) => t.documentId === note.id)).toBe(true);
  });

  it("permanently deletes a note from the bin", async () => {
    const note = await useNotesStore.getState().createNote({
      title: "Permanently Doomed",
    });

    await useNotesStore.getState().deleteNote(note.id);
    expect(useBinStore.getState().binnedNotes.length).toBe(1);

    await useBinStore.getState().deletePermanently(note.id);
    expect(useBinStore.getState().binnedNotes.length).toBe(0);

    const fromMock = await mockIpcBridge.listBinnedNotes();
    expect(fromMock.length).toBe(0);
  });

  it("empties all notes from the bin", async () => {
    const note1 = await useNotesStore.getState().createNote({ title: "Note 1" });
    const note2 = await useNotesStore.getState().createNote({ title: "Note 2" });

    await useNotesStore.getState().deleteNote(note1.id);
    await useNotesStore.getState().deleteNote(note2.id);
    expect(useBinStore.getState().binnedNotes.length).toBe(2);

    await useBinStore.getState().emptyBin();
    expect(useBinStore.getState().binnedNotes.length).toBe(0);
  });

  it("manages bin modal state and preview note", () => {
    expect(useBinStore.getState().isBinModalOpen).toBe(false);

    useBinStore.getState().openBinModal();
    expect(useBinStore.getState().isBinModalOpen).toBe(true);

    useBinStore.getState().closeBinModal();
    expect(useBinStore.getState().isBinModalOpen).toBe(false);
  });

  it("moves a DSM entry to the bin and restores it back to DSM document", async () => {
    const { useDsmStore } = await import("../stores/useDsmStore");
    await useDsmStore.getState().loadDsm();

    const dsmEntry = useDsmStore.getState().createOrGetEntry("2026-10-05", ["standup"]);
    expect(useDsmStore.getState().dsmDoc?.entries.some((e) => e.id === dsmEntry.id)).toBe(true);

    // Delete DSM entry
    await useDsmStore.getState().deleteEntry(dsmEntry.id);

    // DSM doc no longer contains the entry
    expect(useDsmStore.getState().dsmDoc?.entries.some((e) => e.id === dsmEntry.id)).toBe(false);

    // Bin now contains the DSM note with originalSection: "Daily Stand-up"
    const binned = useBinStore.getState().binnedNotes;
    const binnedDsm = binned.find((b) => b.id === dsmEntry.id);
    expect(binnedDsm).toBeDefined();
    expect(binnedDsm?.originalSection).toBe("Daily Stand-up");
    expect(binnedDsm?.title).toContain("2026-10-05");

    // Restore DSM entry from bin
    await useBinStore.getState().restoreNote(dsmEntry.id);

    // Bin no longer has this item
    expect(useBinStore.getState().binnedNotes.some((b) => b.id === dsmEntry.id)).toBe(false);

    // DSM document has the entry back
    const restoredDsmEntry = useDsmStore.getState().dsmDoc?.entries.find((e) => e.id === dsmEntry.id);
    expect(restoredDsmEntry).toBeDefined();
    expect(restoredDsmEntry?.date).toBe("2026-10-05");
  });
});
