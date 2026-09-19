import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { useWorkspaceStore } from "../stores/useWorkspaceStore";
import { mockIpcBridge } from "@infrastructure/tauri/mockIpcBridge";

const storageMap = new Map<string, string>();

beforeAll(() => {
  // Polyfill localStorage for node vitest environment
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, val: string) => {
        storageMap.set(key, val);
      },
      removeItem: (key: string) => {
        storageMap.delete(key);
      },
      clear: () => {
        storageMap.clear();
      },
      key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
      get length() {
        return storageMap.size;
      },
    },
    writable: true,
  });
});

describe("useWorkspaceStore", () => {
  beforeEach(() => {
    storageMap.clear();
    useWorkspaceStore.setState({
      workspace: null,
      isLoading: false,
      error: null,
      recentNotes: [],
      recentWorkspaces: [],
      isWorkspaceModalOpen: false,
    });
  });

  it("shows workspace modal when initialized without prior workspace", async () => {
    await useWorkspaceStore.getState().init();
    const { workspace, isWorkspaceModalOpen } = useWorkspaceStore.getState();
    expect(workspace).toBeNull();
    expect(isWorkspaceModalOpen).toBe(true);
  });

  it("creates a new workspace and updates recent workspaces", async () => {
    const ws = await useWorkspaceStore
      .getState()
      .createWorkspace("/path/to/my-workspace", "Test Engineering");

    expect(ws.name).toBe("Test Engineering");
    expect(ws.path).toBe("/path/to/my-workspace");

    const state = useWorkspaceStore.getState();
    expect(state.workspace?.id).toBe(ws.id);
    expect(state.isWorkspaceModalOpen).toBe(false);
    expect(state.recentWorkspaces).toHaveLength(1);
    expect(state.recentWorkspaces[0]?.name).toBe("Test Engineering");
  });

  it("opens an existing workspace", async () => {
    const ws = await useWorkspaceStore
      .getState()
      .openWorkspace("/path/to/existing");

    expect(ws.path).toBe("/path/to/existing");
    const state = useWorkspaceStore.getState();
    expect(state.workspace?.path).toBe("/path/to/existing");
    expect(state.isWorkspaceModalOpen).toBe(false);
  });

  it("updates workspace settings", async () => {
    await useWorkspaceStore
      .getState()
      .createWorkspace("/path/to/ws", "Settings WS");

    await useWorkspaceStore.getState().updateSettings({
      editorFontSize: 18,
      theme: "light",
    });

    const state = useWorkspaceStore.getState();
    expect(state.workspace?.settings.editorFontSize).toBe(18);
    expect(state.workspace?.settings.theme).toBe("light");
  });

  it("rebuilds index and refreshes notes", async () => {
    await useWorkspaceStore
      .getState()
      .createWorkspace("/path/to/ws", "Rebuild WS");

    // Save a note in mock bridge
    await mockIpcBridge.saveGeneralNote({
      id: "not_sample_rebuild",
      schemaVersion: 1,
      title: "Rebuild Test Note",
      tags: ["test"],
      content: { type: "doc" },
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const stats = await useWorkspaceStore.getState().rebuildIndex();
    expect(stats.indexedDocuments).toBeGreaterThanOrEqual(1);

    const notes = useWorkspaceStore.getState().recentNotes;
    expect(notes.some((n) => n.id === "not_sample_rebuild")).toBe(true);
  });

  it("deletes a note and refreshes recent notes list", async () => {
    await useWorkspaceStore
      .getState()
      .createWorkspace("/path/to/ws", "Delete WS");

    await mockIpcBridge.saveGeneralNote({
      id: "not_to_delete",
      schemaVersion: 1,
      title: "Delete Me",
      tags: ["temp"],
      content: { type: "doc" },
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await useWorkspaceStore.getState().refreshNotes();
    expect(
      useWorkspaceStore.getState().recentNotes.some((n) => n.id === "not_to_delete")
    ).toBe(true);

    await useWorkspaceStore.getState().deleteNote("not_to_delete");
    expect(
      useWorkspaceStore.getState().recentNotes.some((n) => n.id === "not_to_delete")
    ).toBe(false);
  });
});
