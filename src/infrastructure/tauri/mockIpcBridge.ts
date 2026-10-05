import type { IpcBridge, AppInfo, IndexStats, PerformanceMetrics, SyncConflictInfo, AssetInfo } from "./ipcBridge";
import type { Workspace, WorkspaceSettings } from "@domain/workspace.types";
import { DEFAULT_WORKSPACE_SETTINGS } from "@domain/workspace.types";
import type { DsmDocument, DsmEntry } from "@domain/dsm.types";
import type { CoursesDocument } from "@domain/courses.types";
import { createDefaultCoursesDocument } from "@domain/courses.utils";
import type { GeneralNote, NoteMetadata } from "@domain/note.types";
import type { BinnedNoteRecord } from "@domain/bin.types";
import type { SearchResultItem } from "@domain/search.types";
import type { ResourceReference, BacklinkReference, ResourceType } from "@domain/resource.types";
import { parseSearchQuery } from "@domain/search.parser";
import { extractResourcesFromDoc } from "@domain/resourceExtractor";
import { proseMirrorDocToText } from "@domain/dsm.utils";

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
  private coursesDoc: CoursesDocument = createDefaultCoursesDocument();
  private notes: Map<string, GeneralNote> = new Map();
  private binnedNotes: Map<string, BinnedNoteRecord> = new Map();
  private mockConflicts: SyncConflictInfo[] = [];

  reset(): void {
    this.activeWorkspace = null;
    this.notes.clear();
    this.binnedNotes.clear();
    this.mockConflicts = [];
    this.coursesDoc = createDefaultCoursesDocument();
    this.dsmDoc = {
      id: "dsm_master",
      schemaVersion: 1,
      title: "Daily Stand-up Journal",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entries: [],
    };
  }

  async getAppInfo(): Promise<AppInfo> {
    return {
      name: "Chronote (Mock Environment)",
      version: "0.1.7-mock",
      description: "Mock IPC Bridge for development and testing",
    };
  }

  async ping(): Promise<string> {
    return "pong";
  }

  async openExternalUrl(url: string): Promise<void> {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async revealInExplorer(path: string): Promise<void> {
    console.log(`[Mock] revealInExplorer: ${path}`);
  }

  async openFile(path: string): Promise<void> {
    console.log(`[Mock] openFile: ${path}`);
  }

  async pickAssetFile(assetType: "image" | "file"): Promise<AssetInfo | null> {
    const isImage = assetType === "image";
    const id = `${isImage ? "img" : "att"}_mock_${Date.now()}`;
    const fileName = isImage ? "mock_screenshot.png" : "mock_document.pdf";
    return {
      id,
      fileName,
      relativePath: `assets/${isImage ? "images" : "files"}/${id}_${fileName}`,
      absolutePath: `/mock/workspace/assets/${isImage ? "images" : "files"}/${id}_${fileName}`,
      mimeType: isImage ? "image/png" : "application/pdf",
      fileSize: isImage ? 142500 : 256000,
    };
  }

  async saveAssetBinary(
    assetType: "image" | "file",
    fileName: string,
    data: Uint8Array
  ): Promise<AssetInfo> {
    const isImage = assetType === "image";
    const id = `${isImage ? "img" : "att"}_mock_${Date.now()}`;
    return {
      id,
      fileName,
      relativePath: `assets/${isImage ? "images" : "files"}/${id}_${fileName}`,
      absolutePath: `/mock/workspace/assets/${isImage ? "images" : "files"}/${id}_${fileName}`,
      mimeType: isImage ? "image/png" : "application/octet-stream",
      fileSize: data.length,
    };
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

  async readCoursesDocument(): Promise<CoursesDocument> {
    return JSON.parse(JSON.stringify(this.coursesDoc));
  }

  async saveCoursesDocument(doc: CoursesDocument): Promise<void> {
    this.coursesDoc = JSON.parse(JSON.stringify(doc));
    this.coursesDoc.updatedAt = new Date().toISOString();
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

  async moveNoteToBin(id: string): Promise<BinnedNoteRecord> {
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Check if it's a general note
    const note = this.notes.get(id);
    if (note) {
      const binned: BinnedNoteRecord = {
        id: note.id,
        title: note.title,
        tags: [...note.tags],
        deletedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        originalSection: "General Notes",
        note: JSON.parse(JSON.stringify(note)),
      };
      this.binnedNotes.set(id, binned);
      this.notes.delete(id);
      return binned;
    }

    // 2. Check if it's a DSM entry
    const dsmEntryIdx = this.dsmDoc.entries.findIndex((e) => e.id === id);
    if (dsmEntryIdx !== -1) {
      const entry = this.dsmDoc.entries[dsmEntryIdx];
      this.dsmDoc.entries.splice(dsmEntryIdx, 1);
      this.dsmDoc.updatedAt = now.toISOString();

      const generalNote: GeneralNote = {
        id: entry.id,
        schemaVersion: 1,
        title: `Daily Stand-up — ${entry.date}`,
        tags: [...entry.tags],
        content: JSON.parse(JSON.stringify(entry.content)),
        pinned: false,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };

      const binned: BinnedNoteRecord = {
        id: entry.id,
        title: `Daily Stand-up — ${entry.date}`,
        tags: [...entry.tags],
        deletedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        originalSection: "Daily Stand-up",
        dsmDate: entry.date,
        note: generalNote,
      };
      this.binnedNotes.set(id, binned);
      return binned;
    }

    throw new Error(`Note or DSM entry ${id} not found to move to bin`);
  }

  async restoreNoteFromBin(id: string): Promise<GeneralNote> {
    const binned = this.binnedNotes.get(id);
    if (!binned) {
      throw new Error(`Binned note ${id} not found to restore`);
    }

    if (binned.originalSection === "Daily Stand-up" || binned.dsmDate || id.startsWith("ent_")) {
      const date =
        binned.dsmDate ||
        binned.title.split("—").pop()?.trim() ||
        new Date().toISOString().split("T")[0];
      const restoredEntry: DsmEntry = {
        id: binned.id,
        date,
        tags: [...binned.tags],
        collapsed: false,
        content: JSON.parse(JSON.stringify(binned.note.content)),
        createdAt: binned.note.createdAt,
        updatedAt: new Date().toISOString(),
      };

      const existingIdx = this.dsmDoc.entries.findIndex(
        (e) => e.id === restoredEntry.id || e.date === restoredEntry.date
      );
      if (existingIdx !== -1) {
        this.dsmDoc.entries[existingIdx] = restoredEntry;
      } else {
        this.dsmDoc.entries.push(restoredEntry);
      }
      this.dsmDoc.entries.sort((a, b) => b.date.localeCompare(a.date));
      this.dsmDoc.updatedAt = new Date().toISOString();
      this.binnedNotes.delete(id);
      return binned.note;
    }

    const restored: GeneralNote = {
      ...binned.note,
      updatedAt: new Date().toISOString(),
    };
    this.notes.set(id, restored);
    this.binnedNotes.delete(id);
    return restored;
  }

  async listBinnedNotes(): Promise<BinnedNoteRecord[]> {
    const nowMs = Date.now();
    const list: BinnedNoteRecord[] = [];
    for (const [id, record] of Array.from(this.binnedNotes.entries())) {
      const expiresMs = new Date(record.expiresAt).getTime();
      if (!isNaN(expiresMs) && expiresMs < nowMs) {
        this.binnedNotes.delete(id);
      } else {
        list.push(record);
      }
    }
    list.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
    return list;
  }

  async deleteBinnedNotePermanently(id: string): Promise<void> {
    this.binnedNotes.delete(id);
  }

  async emptyBin(): Promise<number> {
    const count = this.binnedNotes.size;
    this.binnedNotes.clear();
    return count;
  }

  async searchWorkspace(query: string): Promise<SearchResultItem[]> {
    const ast = parseSearchQuery(query);
    const results: SearchResultItem[] = [];

    // Helper to highlight matches in text
    const highlight = (text: string, terms: string[]): string => {
      let res = text;
      for (const term of terms) {
        if (!term) continue;
        const clean = term.replace(/\*/g, "");
        if (!clean) continue;
        const reg = new RegExp(`(${clean})`, "gi");
        res = res.replace(reg, "<mark>$1</mark>");
      }
      return res;
    };

    const allSearchTerms = [...ast.textTokens, ...ast.exactPhrases];

    // 1. Search General Notes
    if (ast.documentTypes.length === 0 || ast.documentTypes.includes("general")) {
      for (const note of this.notes.values()) {
        // Check tags filter
        if (ast.tags.length > 0 && !ast.tags.every((t) => note.tags.includes(t))) {
          continue;
        }

        // Search through blocks in note.content
        if (note.content?.content && Array.isArray(note.content.content)) {
          for (let i = 0; i < note.content.content.length; i++) {
            const block = note.content.content[i];
            if (!block) continue;
            const blockType = (block.type as string) || "paragraph";
            const blockId = (block.attrs?.id as string) || `blk_${note.id}_${i}`;
            const lang = (block.attrs?.language as string) || undefined;

            if (ast.blockTypes.length > 0 && !ast.blockTypes.includes(blockType) && !(ast.blockTypes.includes("code") && (blockType === "codeBlock" || blockType === "code"))) {
              continue;
            }
            if (ast.languages.length > 0 && (!lang || !ast.languages.includes(lang.toLowerCase()))) {
              continue;
            }

            const plainText = proseMirrorDocToText({ type: "doc", content: [block] });
            const lowerText = plainText.toLowerCase();

            // Match text tokens and phrases
            let matches = allSearchTerms.length === 0;
            if (allSearchTerms.length > 0) {
              matches = allSearchTerms.every((t) => {
                const clean = t.toLowerCase().replace(/\*/g, "");
                return lowerText.includes(clean) || note.tags.some((tag) => tag.includes(clean));
              });
            }

            if (matches) {
              const snippetText = plainText.slice(0, 160);
              results.push({
                blockId,
                documentId: note.id,
                documentType: "general",
                documentTitle: note.title,
                blockType,
                language: lang,
                tags: note.tags,
                excerpt: highlight(snippetText, allSearchTerms),
                score: 1.0,
              });
            }
          }
        }
      }
    }

    // 2. Search DSM entries
    if (ast.documentTypes.length === 0 || ast.documentTypes.includes("dsm")) {
      for (const entry of this.dsmDoc.entries) {
        // Date filters
        if (ast.exactDate && entry.date !== ast.exactDate) continue;
        if (ast.afterDate && entry.date < ast.afterDate) continue;
        if (ast.beforeDate && entry.date > ast.beforeDate) continue;

        // Tags filter
        if (ast.tags.length > 0 && !ast.tags.every((t) => entry.tags.includes(t))) {
          continue;
        }

        if (entry.content?.content && Array.isArray(entry.content.content)) {
          for (let i = 0; i < entry.content.content.length; i++) {
            const block = entry.content.content[i];
            if (!block) continue;
            const blockType = (block.type as string) || "paragraph";
            const blockId = (block.attrs?.id as string) || `blk_${entry.id}_${i}`;
            const lang = (block.attrs?.language as string) || undefined;

            if (ast.blockTypes.length > 0 && !ast.blockTypes.includes(blockType) && !(ast.blockTypes.includes("code") && (blockType === "codeBlock" || blockType === "code"))) {
              continue;
            }
            if (ast.languages.length > 0 && (!lang || !ast.languages.includes(lang.toLowerCase()))) {
              continue;
            }

            const plainText = proseMirrorDocToText({ type: "doc", content: [block] });
            const lowerText = plainText.toLowerCase();

            let matches = allSearchTerms.length === 0;
            if (allSearchTerms.length > 0) {
              matches = allSearchTerms.every((t) => {
                const clean = t.toLowerCase().replace(/\*/g, "");
                return lowerText.includes(clean) || entry.tags.some((tag) => tag.includes(clean));
              });
            }

            if (matches) {
              const snippetText = plainText.slice(0, 160);
              results.push({
                blockId,
                documentId: this.dsmDoc.id,
                documentType: "dsm",
                documentTitle: `DSM Stand-up (${entry.date})`,
                entryId: entry.id,
                entryDate: entry.date,
                blockType,
                language: lang,
                tags: entry.tags,
                excerpt: highlight(snippetText, allSearchTerms),
                score: 1.0,
              });
            }
          }
        }
      }
    }

    return results;
  }

  async getResources(options?: {
    documentId?: string;
    resourceType?: ResourceType;
  }): Promise<ResourceReference[]> {
    const allResources: ResourceReference[] = [];

    // Collect from General Notes
    for (const note of this.notes.values()) {
      if (options?.documentId && note.id !== options.documentId) continue;
      const { resources } = extractResourcesFromDoc(note.content, {
        parentDocumentId: note.id,
        parentDocumentType: "general",
        parentDocumentTitle: note.title,
      });
      allResources.push(...resources);
    }

    // Collect from DSM entries
    if (!options?.documentId || options.documentId === this.dsmDoc.id) {
      for (const entry of this.dsmDoc.entries) {
        const { resources } = extractResourcesFromDoc(entry.content, {
          parentDocumentId: this.dsmDoc.id,
          parentDocumentType: "dsm",
          parentDocumentTitle: `DSM Stand-up (${entry.date})`,
          entryId: entry.id,
          entryDate: entry.date,
        });
        allResources.push(...resources);
      }
    }

    if (options?.resourceType) {
      return allResources.filter((r) => r.resourceType === options.resourceType);
    }

    return allResources;
  }

  async getBacklinks(targetNoteId: string): Promise<BacklinkReference[]> {
    const allBacklinks: BacklinkReference[] = [];

    // From notes
    for (const note of this.notes.values()) {
      const { backlinks } = extractResourcesFromDoc(note.content, {
        parentDocumentId: note.id,
        parentDocumentType: "general",
        parentDocumentTitle: note.title,
      });
      for (const b of backlinks) {
        if (b.targetNoteId === targetNoteId) {
          allBacklinks.push(b);
        }
      }
    }

    // From DSM entries
    for (const entry of this.dsmDoc.entries) {
      const { backlinks } = extractResourcesFromDoc(entry.content, {
        parentDocumentId: this.dsmDoc.id,
        parentDocumentType: "dsm",
        parentDocumentTitle: `DSM Stand-up (${entry.date})`,
        entryId: entry.id,
        entryDate: entry.date,
      });
      for (const b of backlinks) {
        if (b.targetNoteId === targetNoteId) {
          allBacklinks.push(b);
        }
      }
    }

    return allBacklinks;
  }

  async pickExportFilePath(defaultName: string, _extension: string, _filterName: string): Promise<string | null> {
    return `/mock/exports/${defaultName}`;
  }

  async saveExportedFile(path: string, content: Uint8Array | string): Promise<void> {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      try {
        const filename = path.split(/[/\\]/).pop() || "export";
        const blob =
          typeof content === "string"
            ? new Blob([content], { type: "text/plain;charset=utf-8" })
            : new Blob([content as Uint8Array<ArrayBuffer>], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        // Fallback for non-browser/test environments
      }
    }
  }

  async exportWorkspaceBackup(outputPath?: string): Promise<string> {
    const dest = outputPath || "/mock/exports/chronote-backup.zip";
    return dest;
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    return {
      memoryRssBytes: 52428800,
      memoryRssMb: 50.0,
      dbSizeBytes: 1048576,
      totalDocuments: this.notes.size + 1,
      totalBlocks: (this.notes.size + 1) * 3,
      totalTags: 12,
      uptimeSeconds: 120,
    };
  }

  setMockConflicts(conflicts: SyncConflictInfo[]): void {
    this.mockConflicts = [...conflicts];
  }

  async getSyncConflicts(): Promise<SyncConflictInfo[]> {
    return [...this.mockConflicts];
  }

  async resolveConflict(
    conflictFilePath: string,
    _resolution: "keep_local" | "use_conflicted" | "keep_both"
  ): Promise<void> {
    this.mockConflicts = this.mockConflicts.filter((c) => c.conflictFilePath !== conflictFilePath);
  }
}

export const mockIpcBridge = new MockIpcBridge();
