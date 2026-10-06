import { create } from "zustand";
import type {
  CloudSyncConfig,
  CloudAccountInfo,
  SyncExecutionResult,
} from "@domain/cloudSync.types";
import { DEFAULT_CLOUD_SYNC_CONFIG } from "@domain/cloudSync.types";
import {
  executeCloudSync,
  createCloudAdapter,
} from "@domain/cloud/cloudSyncEngine";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";
import { useWorkspaceStore } from "./useWorkspaceStore";

interface CloudSyncState {
  config: CloudSyncConfig;
  isConfigLoaded: boolean;
  isTestingConnection: boolean;
  isSyncing: boolean;
  isSyncModalOpen: boolean;
  lastSyncResult: SyncExecutionResult | null;
  errorMessage: string | null;
  autoSyncTimerId: number | null;

  loadConfig: () => Promise<void>;
  updateConfig: (partial: Partial<CloudSyncConfig>) => Promise<void>;
  testConnection: (accessToken: string) => Promise<CloudAccountInfo>;
  syncNow: () => Promise<SyncExecutionResult>;
  setSyncModalOpen: (open: boolean) => void;
  clearError: () => void;
}

export const useCloudSyncStore = create<CloudSyncState>((set, get) => ({
  config: { ...DEFAULT_CLOUD_SYNC_CONFIG },
  isConfigLoaded: false,
  isTestingConnection: false,
  isSyncing: false,
  isSyncModalOpen: false,
  lastSyncResult: null,
  errorMessage: null,
  autoSyncTimerId: null,

  loadConfig: async () => {
    try {
      const saved = await ipcBridge.readCloudSyncConfig();
      if (saved) {
        set({ config: saved, isConfigLoaded: true });
      } else {
        set({ isConfigLoaded: true });
      }
    } catch (err: any) {
      console.warn("Could not load cloud sync config from disk:", err);
      set({ isConfigLoaded: true });
    }
  },

  updateConfig: async (partial) => {
    const nextConfig: CloudSyncConfig = {
      ...get().config,
      ...partial,
    };
    set({ config: nextConfig });
    try {
      await ipcBridge.saveCloudSyncConfig(nextConfig);
    } catch (err) {
      console.error("Failed to persist cloud sync config:", err);
    }
  },

  testConnection: async (accessToken: string) => {
    set({ isTestingConnection: true, errorMessage: null });
    try {
      const adapter = createCloudAdapter({ ...get().config, accessToken });
      const account = await adapter.testConnection(accessToken);
      await get().updateConfig({
        accessToken,
        account,
        connectedAt: new Date().toISOString(),
      });
      set({ isTestingConnection: false });
      return account;
    } catch (err: any) {
      const msg = err?.message || String(err);
      set({ isTestingConnection: false, errorMessage: msg });
      throw err;
    }
  },

  syncNow: async () => {
    const config = get().config;
    if (!config.accessToken) {
      throw new Error("Cannot sync without a valid access token. Please connect first.");
    }

    set({ isSyncing: true, errorMessage: null });
    try {
      const result = await executeCloudSync(config);
      const updatedConfig: Partial<CloudSyncConfig> = {
        lastSyncAt: result.completedAt,
      };
      await get().updateConfig(updatedConfig);

      set({
        isSyncing: false,
        lastSyncResult: result,
      });

      // Refresh notes and DSM stores to reflect newly synchronized items
      void useWorkspaceStore.getState().refreshNotes();

      return result;
    } catch (err: any) {
      const msg = err?.message || String(err);
      set({ isSyncing: false, errorMessage: msg });
      throw err;
    }
  },

  setSyncModalOpen: (open) => set({ isSyncModalOpen: open }),
  clearError: () => set({ errorMessage: null }),
}));
