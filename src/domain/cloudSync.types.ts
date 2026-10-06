export type CloudProvider = "google_drive" | "onedrive" | "mock";

export interface CloudAccountInfo {
  email?: string | undefined;
  name?: string | undefined;
  picture?: string | undefined;
  quotaTotalBytes?: number | undefined;
  quotaUsedBytes?: number | undefined;
}

export interface CloudSyncConfig {
  provider: CloudProvider;
  enabled: boolean;
  clientId: string;
  accessToken: string;
  refreshToken?: string | undefined;
  targetFolderPath: string; // e.g. "Chronote"
  targetFolderId?: string | undefined;
  autoSyncIntervalMinutes: number; // 0 = manual only, 5, 15, 30, 60
  lastSyncAt?: string | undefined;
  connectedAt?: string | undefined;
  account?: CloudAccountInfo | undefined;
}

export type SyncItemStatus =
  | "synced"
  | "pending_upload"
  | "pending_download"
  | "conflict"
  | "error";

export interface SyncFileItem {
  id: string; // local note id or "dsm" or "courses"
  path: string; // relative path: "notes/xxx.json"
  name: string;
  documentType: "general" | "dsm" | "courses" | "asset";
  localModifiedTime?: string | undefined;
  remoteModifiedTime?: string | undefined;
  remoteFileId?: string | undefined;
  status: SyncItemStatus;
  detail?: string | undefined;
}

export interface SyncExecutionResult {
  success: boolean;
  startedAt: string;
  completedAt: string;
  filesUploaded: number;
  filesDownloaded: number;
  conflictsFound: number;
  errors: string[];
  items: SyncFileItem[];
}

export const DEFAULT_CLOUD_SYNC_CONFIG: CloudSyncConfig = {
  provider: "google_drive",
  enabled: false,
  clientId: "",
  accessToken: "",
  targetFolderPath: "Chronote",
  autoSyncIntervalMinutes: 0,
};
