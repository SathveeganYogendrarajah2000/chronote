import { invoke } from "@tauri-apps/api/core";
import type { Workspace, WorkspaceSettings } from "@domain/workspace.types";
import type { DsmDocument } from "@domain/dsm.types";
import type { CoursesDocument } from "@domain/courses.types";
import type { GeneralNote, NoteMetadata } from "@domain/note.types";
import type { SearchResultItem } from "@domain/search.types";
import type { ResourceReference, BacklinkReference, ResourceType } from "@domain/resource.types";
import type { BinnedNoteRecord } from "@domain/bin.types";
import type { BacklinksGraphData } from "@domain/graph.types";
import type { CloudSyncConfig } from "@domain/cloudSync.types";
import { mockIpcBridge } from "./mockIpcBridge";

export interface IndexStats {
  indexedDocuments: number;
  indexedBlocks: number;
  indexedTags: number;
}

export interface AppInfo {
  name: string;
  version: string;
  description: string;
}

export interface PerformanceMetrics {
  memoryRssBytes: number;
  memoryRssMb: number;
  dbSizeBytes: number;
  totalDocuments: number;
  totalBlocks: number;
  totalTags: number;
  uptimeSeconds: number;
}

export interface SyncConflictInfo {
  conflictFilePath: string;
  conflictFileName: string;
  originalFileName: string;
  targetId: string;
  documentType: "general" | "dsm";
  title: string;
  syncSource: string;
  conflictDetectedAt: string;
  localUpdatedAt?: string | null;
  conflictedUpdatedAt?: string | null;
  previewText: string;
}

export interface AssetInfo {
  id: string;
  fileName: string;
  relativePath: string;
  absolutePath: string;
  mimeType: string;
  fileSize: number;
}

export interface IpcBridge {
  getAppInfo(): Promise<AppInfo>;
  ping(): Promise<string>;
  openExternalUrl(url: string): Promise<void>;
  revealInExplorer(path: string): Promise<void>;
  openFile(path: string): Promise<void>;
  pickAssetFile(assetType: "image" | "file"): Promise<AssetInfo | null>;
  saveAssetBinary(assetType: "image" | "file", fileName: string, data: Uint8Array): Promise<AssetInfo>;
  pickWorkspaceDirectory(): Promise<string | null>;
  createWorkspace(path: string, name: string): Promise<Workspace>;
  openWorkspace(path: string): Promise<Workspace>;
  getActiveWorkspace(): Promise<Workspace | null>;
  saveWorkspaceSettings(settings: WorkspaceSettings): Promise<Workspace>;
  rebuildIndex(): Promise<IndexStats>;
  readDsmDocument(): Promise<DsmDocument>;
  saveDsmDocument(doc: DsmDocument): Promise<void>;
  readCoursesDocument(): Promise<CoursesDocument>;
  saveCoursesDocument(doc: CoursesDocument): Promise<void>;
  readGeneralNote(id: string): Promise<GeneralNote>;
  saveGeneralNote(note: GeneralNote): Promise<void>;
  listGeneralNotes(): Promise<NoteMetadata[]>;
  deleteGeneralNote(id: string): Promise<void>;
  moveNoteToBin(id: string): Promise<BinnedNoteRecord>;
  restoreNoteFromBin(id: string): Promise<GeneralNote>;
  listBinnedNotes(): Promise<BinnedNoteRecord[]>;
  deleteBinnedNotePermanently(id: string): Promise<void>;
  emptyBin(): Promise<number>;
  searchWorkspace(query: string): Promise<SearchResultItem[]>;
  getResources(options?: { documentId?: string; resourceType?: ResourceType }): Promise<ResourceReference[]>;
  getBacklinks(targetNoteId: string): Promise<BacklinkReference[]>;
  getBacklinksGraph(): Promise<BacklinksGraphData>;
  pickExportFilePath(defaultName: string, extension: string, filterName: string): Promise<string | null>;
  saveExportedFile(path: string, content: Uint8Array | string): Promise<void>;
  exportWorkspaceBackup(outputPath?: string): Promise<string>;
  getPerformanceMetrics(): Promise<PerformanceMetrics>;
  getSyncConflicts(): Promise<SyncConflictInfo[]>;
  resolveConflict(conflictFilePath: string, resolution: "keep_local" | "use_conflicted" | "keep_both"): Promise<void>;
  resolve3WayConflict(conflictFilePath: string, targetId: string, documentType: string, mergedDataJson: string): Promise<void>;
  saveCloudSyncConfig(config: CloudSyncConfig): Promise<void>;
  readCloudSyncConfig(): Promise<CloudSyncConfig | null>;
}

export class TauriIpcBridge implements IpcBridge {
  private isTauriAvailable(): boolean {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  }

  async getAppInfo(): Promise<AppInfo> {
    if (!this.isTauriAvailable()) return mockIpcBridge.getAppInfo();
    try {
      return await invoke<AppInfo>("get_app_info");
    } catch {
      return mockIpcBridge.getAppInfo();
    }
  }

  async ping(): Promise<string> {
    if (!this.isTauriAvailable()) return mockIpcBridge.ping();
    try {
      return await invoke<string>("ping");
    } catch {
      return "pong (fallback)";
    }
  }

  async openExternalUrl(url: string): Promise<void> {
    if (!this.isTauriAvailable()) return mockIpcBridge.openExternalUrl(url);
    try {
      await invoke<void>("open_external_url", { url });
    } catch (err) {
      console.error("open_external_url error:", err);
      // Fallback in case of invoke issue
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
  }

  async revealInExplorer(path: string): Promise<void> {
    if (!this.isTauriAvailable()) return mockIpcBridge.revealInExplorer(path);
    try {
      await invoke<void>("reveal_in_explorer", { path });
    } catch (err) {
      console.error("reveal_in_explorer error:", err);
    }
  }

  async openFile(path: string): Promise<void> {
    if (!this.isTauriAvailable()) return mockIpcBridge.openFile(path);
    try {
      await invoke<void>("open_file", { path });
    } catch (err) {
      console.error("open_file error, falling back to reveal in explorer:", err);
      await this.revealInExplorer(path);
    }
  }

  async pickAssetFile(assetType: "image" | "file"): Promise<AssetInfo | null> {
    if (!this.isTauriAvailable()) return mockIpcBridge.pickAssetFile(assetType);
    try {
      return await invoke<AssetInfo | null>("pick_asset_file", { assetType });
    } catch (err) {
      console.error("pick_asset_file error:", err);
      return null;
    }
  }

  async saveAssetBinary(
    assetType: "image" | "file",
    fileName: string,
    data: Uint8Array
  ): Promise<AssetInfo> {
    if (!this.isTauriAvailable()) return mockIpcBridge.saveAssetBinary(assetType, fileName, data);
    return await invoke<AssetInfo>("save_asset_binary", {
      assetType,
      fileName,
      data: Array.from(data),
    });
  }

  async pickWorkspaceDirectory(): Promise<string | null> {
    if (!this.isTauriAvailable()) return mockIpcBridge.pickWorkspaceDirectory();
    try {
      return await invoke<string | null>("pick_workspace_directory");
    } catch (err) {
      console.error("pick_workspace_directory error:", err);
      return null;
    }
  }

  async createWorkspace(path: string, name: string): Promise<Workspace> {
    if (!this.isTauriAvailable()) return mockIpcBridge.createWorkspace(path, name);
    return await invoke<Workspace>("create_workspace", { path, name });
  }

  async openWorkspace(path: string): Promise<Workspace> {
    if (!this.isTauriAvailable()) return mockIpcBridge.openWorkspace(path);
    return await invoke<Workspace>("open_workspace", { path });
  }

  async getActiveWorkspace(): Promise<Workspace | null> {
    if (!this.isTauriAvailable()) return mockIpcBridge.getActiveWorkspace();
    return await invoke<Workspace | null>("get_active_workspace");
  }

  async saveWorkspaceSettings(settings: WorkspaceSettings): Promise<Workspace> {
    if (!this.isTauriAvailable()) return mockIpcBridge.saveWorkspaceSettings(settings);
    return await invoke<Workspace>("save_workspace_settings", { settings });
  }

  async rebuildIndex(): Promise<IndexStats> {
    if (!this.isTauriAvailable()) return mockIpcBridge.rebuildIndex();
    return await invoke<IndexStats>("rebuild_index");
  }

  async readDsmDocument(): Promise<DsmDocument> {
    if (!this.isTauriAvailable()) return mockIpcBridge.readDsmDocument();
    return await invoke<DsmDocument>("read_dsm_document");
  }

  async saveDsmDocument(doc: DsmDocument): Promise<void> {
    if (!this.isTauriAvailable()) return mockIpcBridge.saveDsmDocument(doc);
    return await invoke<void>("save_dsm_document", { doc });
  }

  async readCoursesDocument(): Promise<CoursesDocument> {
    if (!this.isTauriAvailable()) return mockIpcBridge.readCoursesDocument();
    return await invoke<CoursesDocument>("read_courses_document");
  }

  async saveCoursesDocument(doc: CoursesDocument): Promise<void> {
    if (!this.isTauriAvailable()) return mockIpcBridge.saveCoursesDocument(doc);
    return await invoke<void>("save_courses_document", { doc });
  }

  async readGeneralNote(id: string): Promise<GeneralNote> {
    if (!this.isTauriAvailable()) return mockIpcBridge.readGeneralNote(id);
    return await invoke<GeneralNote>("read_general_note", { id });
  }

  async saveGeneralNote(note: GeneralNote): Promise<void> {
    if (!this.isTauriAvailable()) return mockIpcBridge.saveGeneralNote(note);
    return await invoke<void>("save_general_note", { note });
  }

  async listGeneralNotes(): Promise<NoteMetadata[]> {
    if (!this.isTauriAvailable()) return mockIpcBridge.listGeneralNotes();
    return await invoke<NoteMetadata[]>("list_general_notes");
  }

  async deleteGeneralNote(id: string): Promise<void> {
    if (!this.isTauriAvailable()) return mockIpcBridge.deleteGeneralNote(id);
    return await invoke<void>("delete_general_note", { id });
  }

  async moveNoteToBin(id: string): Promise<BinnedNoteRecord> {
    if (!this.isTauriAvailable()) return mockIpcBridge.moveNoteToBin(id);
    return await invoke<BinnedNoteRecord>("move_note_to_bin", { id });
  }

  async restoreNoteFromBin(id: string): Promise<GeneralNote> {
    if (!this.isTauriAvailable()) return mockIpcBridge.restoreNoteFromBin(id);
    return await invoke<GeneralNote>("restore_note_from_bin", { id });
  }

  async listBinnedNotes(): Promise<BinnedNoteRecord[]> {
    if (!this.isTauriAvailable()) return mockIpcBridge.listBinnedNotes();
    return await invoke<BinnedNoteRecord[]>("list_binned_notes");
  }

  async deleteBinnedNotePermanently(id: string): Promise<void> {
    if (!this.isTauriAvailable()) return mockIpcBridge.deleteBinnedNotePermanently(id);
    return await invoke<void>("delete_binned_note_permanently", { id });
  }

  async emptyBin(): Promise<number> {
    if (!this.isTauriAvailable()) return mockIpcBridge.emptyBin();
    return await invoke<number>("empty_bin");
  }

  async searchWorkspace(query: string): Promise<SearchResultItem[]> {
    if (!this.isTauriAvailable()) return mockIpcBridge.searchWorkspace(query);
    return await invoke<SearchResultItem[]>("search_workspace", { query });
  }

  async getResources(options?: {
    documentId?: string;
    resourceType?: ResourceType;
  }): Promise<ResourceReference[]> {
    if (!this.isTauriAvailable()) return mockIpcBridge.getResources(options);
    return await invoke<ResourceReference[]>("get_resources", {
      documentId: options?.documentId || null,
      resourceType: options?.resourceType || null,
    });
  }

  async getBacklinks(targetNoteId: string): Promise<BacklinkReference[]> {
    if (!this.isTauriAvailable()) return mockIpcBridge.getBacklinks(targetNoteId);
    return await invoke<BacklinkReference[]>("get_backlinks", { targetNoteId });
  }

  async pickExportFilePath(defaultName: string, extension: string, filterName: string): Promise<string | null> {
    if (!this.isTauriAvailable()) return mockIpcBridge.pickExportFilePath(defaultName, extension, filterName);
    try {
      return await invoke<string | null>("pick_export_file_path", { defaultName, extension, filterName });
    } catch (err) {
      console.error("pick_export_file_path error:", err);
      return null;
    }
  }

  async saveExportedFile(path: string, content: Uint8Array | string): Promise<void> {
    if (!this.isTauriAvailable()) return mockIpcBridge.saveExportedFile(path, content);
    const bytes = typeof content === "string" ? Array.from(new TextEncoder().encode(content)) : Array.from(content);
    return await invoke<void>("save_exported_file", { path, content: bytes });
  }

  async exportWorkspaceBackup(outputPath?: string): Promise<string> {
    if (!this.isTauriAvailable()) return mockIpcBridge.exportWorkspaceBackup(outputPath);
    return await invoke<string>("export_workspace_backup", { outputPath: outputPath || null });
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    if (!this.isTauriAvailable()) return mockIpcBridge.getPerformanceMetrics();
    try {
      return await invoke<PerformanceMetrics>("get_performance_metrics");
    } catch {
      return mockIpcBridge.getPerformanceMetrics();
    }
  }

  async getSyncConflicts(): Promise<SyncConflictInfo[]> {
    if (!this.isTauriAvailable()) return mockIpcBridge.getSyncConflicts();
    try {
      return await invoke<SyncConflictInfo[]>("get_sync_conflicts");
    } catch (err) {
      console.error("get_sync_conflicts error:", err);
      return [];
    }
  }

  async resolveConflict(
    conflictFilePath: string,
    resolution: "keep_local" | "use_conflicted" | "keep_both"
  ): Promise<void> {
    if (!this.isTauriAvailable()) return mockIpcBridge.resolveConflict(conflictFilePath, resolution);
    return await invoke<void>("resolve_conflict", { conflictFilePath, resolution });
  }

  async getBacklinksGraph(): Promise<BacklinksGraphData> {
    if (!this.isTauriAvailable()) return mockIpcBridge.getBacklinksGraph();
    return await invoke<BacklinksGraphData>("get_backlinks_graph");
  }

  async resolve3WayConflict(
    conflictFilePath: string,
    targetId: string,
    documentType: string,
    mergedDataJson: string
  ): Promise<void> {
    if (!this.isTauriAvailable()) {
      return mockIpcBridge.resolve3WayConflict(conflictFilePath, targetId, documentType, mergedDataJson);
    }
    return await invoke<void>("resolve_3way_conflict", {
      conflictFilePath,
      targetId,
      documentType,
      mergedDataJson,
    });
  }

  async saveCloudSyncConfig(config: CloudSyncConfig): Promise<void> {
    if (!this.isTauriAvailable()) return mockIpcBridge.saveCloudSyncConfig(config);
    return await invoke<void>("save_cloud_sync_config", {
      configJson: JSON.stringify(config, null, 2),
    });
  }

  async readCloudSyncConfig(): Promise<CloudSyncConfig | null> {
    if (!this.isTauriAvailable()) return mockIpcBridge.readCloudSyncConfig();
    const str = await invoke<string | null>("read_cloud_sync_config");
    if (!str) return null;
    try {
      return JSON.parse(str) as CloudSyncConfig;
    } catch {
      return null;
    }
  }
}

export const ipcBridge = new TauriIpcBridge();
