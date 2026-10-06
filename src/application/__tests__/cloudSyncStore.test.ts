import { describe, it, expect, beforeEach } from "vitest";
import { useCloudSyncStore } from "../stores/useCloudSyncStore";
import { mockIpcBridge } from "@infrastructure/tauri/mockIpcBridge";
import { DEFAULT_CLOUD_SYNC_CONFIG } from "@domain/cloudSync.types";

describe("useCloudSyncStore", () => {
  beforeEach(() => {
    mockIpcBridge.reset();
    useCloudSyncStore.setState({
      config: { ...DEFAULT_CLOUD_SYNC_CONFIG, provider: "mock" },
      isConfigLoaded: false,
      isTestingConnection: false,
      isSyncing: false,
      isSyncModalOpen: false,
      lastSyncResult: null,
      errorMessage: null,
      autoSyncTimerId: null,
    });
  });

  it("loads configuration from persistent store via ipcBridge", async () => {
    await mockIpcBridge.saveCloudSyncConfig({
      ...DEFAULT_CLOUD_SYNC_CONFIG,
      provider: "google_drive",
      enabled: true,
      targetFolderPath: "MyChronoteWorkspace",
    });

    await useCloudSyncStore.getState().loadConfig();

    const state = useCloudSyncStore.getState();
    expect(state.isConfigLoaded).toBe(true);
    expect(state.config.provider).toBe("google_drive");
    expect(state.config.targetFolderPath).toBe("MyChronoteWorkspace");
  });

  it("updates and saves config changes to disk", async () => {
    await useCloudSyncStore.getState().updateConfig({
      provider: "onedrive",
      targetFolderPath: "OneDriveChronote",
    });

    const saved = await mockIpcBridge.readCloudSyncConfig();
    expect(saved?.provider).toBe("onedrive");
    expect(saved?.targetFolderPath).toBe("OneDriveChronote");
    expect(useCloudSyncStore.getState().config.provider).toBe("onedrive");
  });

  it("tests connection and updates account status", async () => {
    // Testing with mock provider
    const account = await useCloudSyncStore.getState().testConnection("valid_token_abc");

    expect(account.email).toBe("engineer@chronote.local");
    const state = useCloudSyncStore.getState();
    expect(state.config.accessToken).toBe("valid_token_abc");
    expect(state.config.account?.email).toBe("engineer@chronote.local");
    expect(state.isTestingConnection).toBe(false);
    expect(state.errorMessage).toBeNull();
  });

  it("records error message on failed connection test", async () => {
    await expect(
      useCloudSyncStore.getState().testConnection("invalid")
    ).rejects.toThrow();

    const state = useCloudSyncStore.getState();
    expect(state.isTestingConnection).toBe(false);
    expect(state.errorMessage).toContain("Invalid mock access token");
  });

  it("executes manual syncNow and updates lastSyncResult", async () => {
    // Set valid access token first
    await useCloudSyncStore.getState().updateConfig({
      provider: "mock",
      accessToken: "valid_token_abc",
    });

    const result = await useCloudSyncStore.getState().syncNow();
    expect(result.success).toBe(true);
    expect(useCloudSyncStore.getState().lastSyncResult).toEqual(result);
    expect(useCloudSyncStore.getState().isSyncing).toBe(false);
  });

  it("toggles sync modal visibility and clears errors", () => {
    useCloudSyncStore.getState().setSyncModalOpen(true);
    expect(useCloudSyncStore.getState().isSyncModalOpen).toBe(true);

    useCloudSyncStore.setState({ errorMessage: "Sample sync failure" });
    useCloudSyncStore.getState().clearError();
    expect(useCloudSyncStore.getState().errorMessage).toBeNull();
  });
});
