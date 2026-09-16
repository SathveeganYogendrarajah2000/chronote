import type { IpcBridge, AppInfo, IndexStats } from "./ipcBridge";
import type { Workspace, WorkspaceSettings } from "@domain/workspace.types";
import { DEFAULT_WORKSPACE_SETTINGS } from "@domain/workspace.types";
import type { DsmDocument } from "@domain/dsm.types";
import type { GeneralNote, NoteMetadata } from "@domain/note.types";

export class MockIpcBridge implements IpcBridge {
  private activeWorkspace: Workspace | null = null;
  private dsmDoc: DsmDocument = {
    id: "dsm_master",
    schemaVersion: 1,
    title: "Daily Stand-up Journal",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entries: [],
  };
  private notes: Map<string, GeneralNote> = new Map();

  async getAppInfo(): Promise<AppInfo> {
    return {
      name: "Chronote (Mock Environment)",
      version: "0.1.0-mock",
      description: "Mock IPC Bridge for development and testing",
    };
  }

  async ping(): Promise<string> {
    return "pong";
  }

  async pickWorkspaceDirectory(): Promise<string | null> {
    return "C:/Users/Developer/Documents/ChronoteWorkspace";
  }

  async createWorkspace(path: string, name: string): Promise<Workspace> {
    const now = new Date().toISOString();
    const ws: Workspace = {
      id: `wsp_mock_${Date.now()}`,
      schemaVersion: 1,
      name,
      path,
      createdAt: now,
      updatedAt: now,
      settings: { ...DEFAULT_WORKSPACE_SETTINGS },
    };
    this.activeWorkspace = ws;
    this.notes.clear();
    this.dsmDoc = {
      id: "dsm_master",
      schemaVersion: 1,
      title: "Daily Stand-up Journal",
      createdAt: now,
      updatedAt: now,
      entries: [],
    };
    return ws;
  }

  async openWorkspace(path: string): Promise<Workspace> {
    const now = new Date().toISOString();
    const ws: Workspace = {
      id: "wsp_mock_existing",
      schemaVersion: 1,
      name: "Mock Engineering Workspace",
      path,
      createdAt: now,
      updatedAt: now,
      settings: { ...DEFAULT_WORKSPACE_SETTINGS },
    };
    this.activeWorkspace = ws;
    return ws;
  }

  async getActiveWorkspace(): Promise<Workspace | null> {
    return this.activeWorkspace;
  }

  async saveWorkspaceSettings(settings: WorkspaceSettings): Promise<Workspace> {
    if (!this.activeWorkspace) {
      throw new Error("No active workspace open");
    }
    this.activeWorkspace = {
      ...this.activeWorkspace,
      settings: { ...settings },
      updatedAt: new Date().toISOString(),
    };
    return this.activeWorkspace;
  }

  async rebuildIndex(): Promise<IndexStats> {
    return {
      indexedDocuments: 1 + this.notes.size,
      indexedBlocks: 10,
      indexedTags: 5,
    };
  }

  async readDsmDocument(): Promise<DsmDocument> {
    return this.dsmDoc;
  }

  async saveDsmDocument(doc: DsmDocument): Promise<void> {
    this.dsmDoc = { ...doc, updatedAt: new Date().toISOString() };
  }

  async readGeneralNote(id: string): Promise<GeneralNote> {
    const note = this.notes.get(id);
    if (!note) {
      throw new Error(`Note ${id} not found in mock store`);
    }
    return note;
  }

  async saveGeneralNote(note: GeneralNote): Promise<void> {
    this.notes.set(note.id, { ...note, updatedAt: new Date().toISOString() });
  }

  async listGeneralNotes(): Promise<NoteMetadata[]> {
    const list: NoteMetadata[] = Array.from(this.notes.values()).map((n) => ({
      id: n.id,
      title: n.title,
      tags: n.tags,
      pinned: n.pinned,
      updatedAt: n.updatedAt,
    }));

    list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return list;
  }

  async deleteGeneralNote(id: string): Promise<void> {
    this.notes.delete(id);
  }
}

export const mockIpcBridge = new MockIpcBridge();
