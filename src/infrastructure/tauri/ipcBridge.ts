import { invoke } from "@tauri-apps/api/core";
import type { Workspace, WorkspaceSettings } from "@domain/workspace.types";
import type { DsmDocument } from "@domain/dsm.types";
import type { GeneralNote, NoteMetadata } from "@domain/note.types";
import type { SearchResultItem } from "@domain/search.types";
import type { ResourceReference, BacklinkReference, ResourceType } from "@domain/resource.types";
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

export interface IpcBridge {
  getAppInfo(): Promise<AppInfo>;
  ping(): Promise<string>;
  pickWorkspaceDirectory(): Promise<string | null>;
  createWorkspace(path: string, name: string): Promise<Workspace>;
  openWorkspace(path: string): Promise<Workspace>;
  getActiveWorkspace(): Promise<Workspace | null>;
  saveWorkspaceSettings(settings: WorkspaceSettings): Promise<Workspace>;
  rebuildIndex(): Promise<IndexStats>;
  readDsmDocument(): Promise<DsmDocument>;
  saveDsmDocument(doc: DsmDocument): Promise<void>;
  readGeneralNote(id: string): Promise<GeneralNote>;
  saveGeneralNote(note: GeneralNote): Promise<void>;
  listGeneralNotes(): Promise<NoteMetadata[]>;
  deleteGeneralNote(id: string): Promise<void>;
  searchWorkspace(query: string): Promise<SearchResultItem[]>;
  getResources(options?: { documentId?: string; resourceType?: ResourceType }): Promise<ResourceReference[]>;
  getBacklinks(targetNoteId: string): Promise<BacklinkReference[]>;
  pickExportFilePath(defaultName: string, extension: string, filterName: string): Promise<string | null>;
  saveExportedFile(path: string, content: Uint8Array | string): Promise<void>;
  exportWorkspaceBackup(outputPath?: string): Promise<string>;
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
}

export const ipcBridge = new TauriIpcBridge();
