import { describe, it, expect, beforeEach } from "vitest";
import { useConflictStore } from "../stores/useConflictStore";
import { mockIpcBridge } from "@infrastructure/tauri/mockIpcBridge";
import type { SyncConflictInfo } from "@infrastructure/tauri/ipcBridge";

describe("useConflictStore", () => {
  beforeEach(() => {
    mockIpcBridge.reset();
    useConflictStore.setState({
      conflicts: [],
      activeConflict: null,
      isScanning: false,
      isConflictModalOpen: false,
    });
  });

  it("scans and detects third-party sync conflicts", async () => {
    const mockConflict: SyncConflictInfo = {
      conflictFilePath: "C:/ws/notes/not_01 (Conflicted Copy 2026-09-19).json",
      conflictFileName: "not_01 (Conflicted Copy 2026-09-19).json",
      originalFileName: "not_01.json",
      targetId: "not_01",
      documentType: "general",
      title: "Distributed Consensus Review",
      syncSource: "Dropbox",
      conflictDetectedAt: new Date().toISOString(),
      previewText: "Preview text content from conflicted copy...",
    };

    mockIpcBridge.setMockConflicts([mockConflict]);

    await useConflictStore.getState().scanConflicts();

    const state = useConflictStore.getState();
    expect(state.conflicts.length).toBe(1);
    expect(state.activeConflict?.title).toBe("Distributed Consensus Review");
    expect(state.activeConflict?.syncSource).toBe("Dropbox");
  });

  it("resolves a sync conflict with keep_both preserving data", async () => {
    const mockConflict: SyncConflictInfo = {
      conflictFilePath: "C:/ws/notes/not_02.sync-conflict-20260919.json",
      conflictFileName: "not_02.sync-conflict-20260919.json",
      originalFileName: "not_02.json",
      targetId: "not_02",
      documentType: "general",
      title: "Query Optimization",
      syncSource: "Syncthing",
      conflictDetectedAt: new Date().toISOString(),
      previewText: "Syncthing edited copy",
    };

    mockIpcBridge.setMockConflicts([mockConflict]);
    await useConflictStore.getState().scanConflicts();
    expect(useConflictStore.getState().conflicts.length).toBe(1);

    await useConflictStore.getState().resolveConflict(mockConflict.conflictFilePath, "keep_both");

    const state = useConflictStore.getState();
    expect(state.conflicts.length).toBe(0);
    expect(state.activeConflict).toBeNull();
    expect(state.isConflictModalOpen).toBe(false);
  });
});
