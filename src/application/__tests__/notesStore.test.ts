import { describe, it, expect, beforeEach, vi } from "vitest";
import { useNotesStore } from "../stores/useNotesStore";
import { useTabsStore } from "../stores/useTabsStore";
import { useWorkspaceStore } from "../stores/useWorkspaceStore";
import { mockIpcBridge } from "@infrastructure/tauri/mockIpcBridge";

describe("useNotesStore", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    useTabsStore.getState().resetTabs();
    useNotesStore.getState().clearActiveNote();
    await useWorkspaceStore.getState().createWorkspace("C:/mock/ws", "Mock WS");
  });

  it("creates a new note, saves it to storage, opens a tab, and sets it active", async () => {
    const note = await useNotesStore.getState().createNote({
      title: "Architecture Decisions",
      tags: ["arch", "adr"],
      initialText: "Decided to use Tauri with Rust.",
    });

    expect(note.id).toMatch(/^not_/);
    expect(note.title).toBe("Architecture Decisions");
    expect(note.tags).toEqual(["adr", "arch"]);

    // Active note in store
    expect(useNotesStore.getState().activeNote?.id).toBe(note.id);

    // Tab opened
    const { tabs, activeTabId } = useTabsStore.getState();
    expect(tabs.some((t) => t.documentId === note.id)).toBe(true);
    expect(activeTabId).toBe(`tab_${note.id}`);

    // Saved in storage
    const stored = await mockIpcBridge.readGeneralNote(note.id);
    expect(stored.title).toBe("Architecture Decisions");
  });

  it("loads an existing note from storage", async () => {
    const created = await useNotesStore.getState().createNote({
      title: "Existing Note",
    });

    useNotesStore.getState().clearActiveNote();
    expect(useNotesStore.getState().activeNote).toBeNull();

    const loaded = await useNotesStore.getState().loadNote(created.id);
    expect(loaded?.id).toBe(created.id);
    expect(useNotesStore.getState().activeNote?.id).toBe(created.id);
  });

  it("updates title immediately in active note and updates corresponding tab title", async () => {
    const note = await useNotesStore.getState().createNote({
      title: "Initial Title",
    });

    useNotesStore.getState().updateTitle("Renamed Title");

    expect(useNotesStore.getState().activeNote?.title).toBe("Renamed Title");
    expect(useNotesStore.getState().isDirty).toBe(true);

    const tab = useTabsStore.getState().tabs.find((t) => t.documentId === note.id);
    expect(tab?.title).toBe("Renamed Title");

    // Fast-forward debounce timer to verify auto-save
    await vi.runAllTimersAsync();
    expect(useNotesStore.getState().isDirty).toBe(false);

    const persisted = await mockIpcBridge.readGeneralNote(note.id);
    expect(persisted.title).toBe("Renamed Title");
  });

  it("adds and removes tags with normalization", async () => {
    const note = await useNotesStore.getState().createNote({
      title: "Tag Testing",
      tags: ["frontend"],
    });

    useNotesStore.getState().addTag("#TypeScript");
    expect(useNotesStore.getState().activeNote?.tags).toEqual(["frontend", "typescript"]);

    // Duplicate tag is ignored
    useNotesStore.getState().addTag("typescript");
    expect(useNotesStore.getState().activeNote?.tags).toEqual(["frontend", "typescript"]);

    useNotesStore.getState().removeTag("frontend");
    expect(useNotesStore.getState().activeNote?.tags).toEqual(["typescript"]);

    await vi.runAllTimersAsync();
    const persisted = await mockIpcBridge.readGeneralNote(note.id);
    expect(persisted.tags).toEqual(["typescript"]);
  });

  it("updates content text and converts to ProseMirror tree", async () => {
    await useNotesStore.getState().createNote({
      title: "Content Test",
    });

    useNotesStore.getState().updateContentText("Line 1\nLine 2");
    expect(useNotesStore.getState().isDirty).toBe(true);

    const content = useNotesStore.getState().activeNote?.content;
    expect(content?.type).toBe("doc");
    expect(content?.content).toHaveLength(2);

    await vi.runAllTimersAsync();
    expect(useNotesStore.getState().isDirty).toBe(false);
  });

  it("updates structured ProseMirror content and saves on debounce", async () => {
    const note = await useNotesStore.getState().createNote({
      title: "Rich Content Note",
    });

    const richDoc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Sprint Architecture" }],
        },
        {
          type: "codeBlock",
          attrs: { language: "typescript", id: "blk_123" },
          content: [{ type: "text", text: "const x = 42;" }],
        },
      ],
    };

    useNotesStore.getState().updateContent(richDoc);
    expect(useNotesStore.getState().isDirty).toBe(true);
    expect(useNotesStore.getState().activeNote?.content).toEqual(richDoc);

    await vi.runAllTimersAsync();
    expect(useNotesStore.getState().isDirty).toBe(false);

    const persisted = await mockIpcBridge.readGeneralNote(note.id);
    expect(persisted.content).toEqual(richDoc);
  });

  it("toggles note pinning and synchronizes tab pin status", async () => {
    const note = await useNotesStore.getState().createNote({
      title: "Pin Note",
    });
    expect(note.pinned).toBe(false);

    // Pin
    await useNotesStore.getState().togglePin(note.id);
    expect(useNotesStore.getState().activeNote?.pinned).toBe(true);

    const tab = useTabsStore.getState().tabs.find((t) => t.documentId === note.id);
    expect(tab?.isPinned).toBe(true);

    // Unpin
    await useNotesStore.getState().togglePin(note.id);
    expect(useNotesStore.getState().activeNote?.pinned).toBe(false);
    const unpinnedTab = useTabsStore.getState().tabs.find((t) => t.documentId === note.id);
    expect(unpinnedTab?.isPinned).toBe(false);
  });

  it("deletes a note, closes its tab, and clears activeNote if currently open", async () => {
    const note = await useNotesStore.getState().createNote({
      title: "Doomed Note",
    });

    expect(useTabsStore.getState().tabs.some((t) => t.documentId === note.id)).toBe(true);

    await useNotesStore.getState().deleteNote(note.id);

    expect(useNotesStore.getState().activeNote).toBeNull();
    expect(useTabsStore.getState().tabs.some((t) => t.documentId === note.id)).toBe(false);

    await expect(mockIpcBridge.readGeneralNote(note.id)).rejects.toThrow();
  });
});
