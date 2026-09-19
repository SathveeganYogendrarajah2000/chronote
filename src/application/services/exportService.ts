import { ipcBridge } from "@infrastructure/tauri/ipcBridge";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useNotesStore } from "@application/stores/useNotesStore";
import { useDsmStore } from "@application/stores/useDsmStore";
import { DSM_TAB_ID } from "@domain/tabs.types";
import type { GeneralNote } from "@domain/note.types";
import type {
  ExportExecutionParams,
  ExportResult,
} from "@domain/export/export.types";
import {
  exportNoteToMarkdown,
  exportDsmEntryToMarkdown,
  exportDsmRangeToMarkdown,
  exportFullDsmToMarkdown,
  sanitizeTitleToFilename,
} from "@domain/export/markdownExporter";
import {
  buildNoteDocx,
  buildDsmEntryDocx,
  buildDsmRangeDocx,
  packDocxToUint8Array,
} from "@domain/export/docxExporter";

export class ExportService {
  /**
   * Executes an export operation according to user-selected options.
   */
  async executeExport(params: ExportExecutionParams): Promise<ExportResult> {
    try {
      if (params.format === "zip") {
        return await this.executeWorkspaceBackup(params.outputPath);
      }

      if (params.format === "pdf") {
        return await this.executePdfPrint();
      }

      if (params.format === "markdown") {
        return await this.executeMarkdownExport(params);
      }

      if (params.format === "docx") {
        return await this.executeDocxExport(params);
      }

      return {
        success: false,
        message: `Unsupported export format: ${params.format}`,
      };
    } catch (err) {
      console.error("Export error:", err);
      return {
        success: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Generates and saves a full workspace backup archive (.zip).
   */
  private async executeWorkspaceBackup(outputPath?: string): Promise<ExportResult> {
    try {
      const savedPath = await ipcBridge.exportWorkspaceBackup(outputPath);
      return {
        success: true,
        filePath: savedPath,
        message: `Workspace backup archive saved to ${savedPath}`,
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Triggers the clean print view and invokes system print pipeline.
   */
  private async executePdfPrint(): Promise<ExportResult> {
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
      return {
        success: true,
        message: "Print dialog opened. Select 'Save as PDF' to export.",
      };
    }
    return {
      success: false,
      message: "Print pipeline is not supported in this environment.",
    };
  }

  /**
   * Exports data to Markdown, either copying to clipboard or saving to file.
   */
  private async executeMarkdownExport(params: ExportExecutionParams): Promise<ExportResult> {
    const { markdown, defaultFilename } = await this.renderMarkdownContent(params);

    if (params.copyToClipboard) {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(markdown);
        return {
          success: true,
          copiedToClipboard: true,
          message: "Markdown copied to clipboard!",
        };
      }
      return {
        success: false,
        message: "Clipboard API not available.",
      };
    }

    const defaultName = `${defaultFilename}.md`;
    const targetPath =
      params.outputPath ||
      (await ipcBridge.pickExportFilePath(defaultName, "md", "Markdown File (*.md)"));

    if (!targetPath) {
      return { success: false, message: "Export cancelled by user." };
    }

    await ipcBridge.saveExportedFile(targetPath, markdown);

    return {
      success: true,
      filePath: targetPath,
      byteCount: new TextEncoder().encode(markdown).length,
      message: `Markdown file saved to ${targetPath}`,
    };
  }

  /**
   * Exports data to Microsoft Word (.docx).
   */
  private async executeDocxExport(params: ExportExecutionParams): Promise<ExportResult> {
    const { doc, defaultFilename } = await this.buildDocxDocument(params);
    const bytes = await packDocxToUint8Array(doc);

    const defaultName = `${defaultFilename}.docx`;
    const targetPath =
      params.outputPath ||
      (await ipcBridge.pickExportFilePath(defaultName, "docx", "Word Document (*.docx)"));

    if (!targetPath) {
      return { success: false, message: "Export cancelled by user." };
    }

    await ipcBridge.saveExportedFile(targetPath, bytes);

    return {
      success: true,
      filePath: targetPath,
      byteCount: bytes.length,
      message: `Word document saved to ${targetPath}`,
    };
  }

  /**
   * Internal helper: renders markdown string based on scope.
   */
  private async renderMarkdownContent(
    params: ExportExecutionParams
  ): Promise<{ markdown: string; defaultFilename: string }> {
    const { scope, markdownOptions, dateRange, selectedEntryDate } = params;
    const { activeTabId } = useTabsStore.getState();
    const { dsmDoc } = useDsmStore.getState();
    const { activeNote } = useNotesStore.getState();

    // 1. Single DSM entry
    if (scope === "dsmEntry" && selectedEntryDate) {
      const entry = dsmDoc?.entries.find((e) => e.date === selectedEntryDate);
      if (!entry) throw new Error(`DSM entry for date ${selectedEntryDate} not found.`);
      return {
        markdown: exportDsmEntryToMarkdown(entry, markdownOptions),
        defaultFilename: `dsm-${selectedEntryDate}`,
      };
    }

    // 2. DSM Date range
    if (scope === "dsmRange" && dsmDoc) {
      const md = exportDsmRangeToMarkdown(dsmDoc.entries, dateRange, markdownOptions);
      const filename = dateRange
        ? `dsm-range-${dateRange.from}-to-${dateRange.to}`
        : "dsm-journal";
      return { markdown: md, defaultFilename: filename };
    }

    // 3. Active document
    if (scope === "activeDocument") {
      if (activeTabId === DSM_TAB_ID) {
        if (!dsmDoc) throw new Error("DSM journal is not loaded.");
        return {
          markdown: exportFullDsmToMarkdown(dsmDoc, markdownOptions),
          defaultFilename: "dsm-journal",
        };
      }

      if (activeNote) {
        return {
          markdown: exportNoteToMarkdown(activeNote, markdownOptions),
          defaultFilename: sanitizeTitleToFilename(activeNote.title),
        };
      }

      // Try reading note from active tab
      const tab = useTabsStore.getState().tabs.find((t) => t.id === activeTabId);
      if (tab?.documentType === "general") {
        const note = await ipcBridge.readGeneralNote(tab.documentId);
        return {
          markdown: exportNoteToMarkdown(note, markdownOptions),
          defaultFilename: sanitizeTitleToFilename(note.title),
        };
      }

      throw new Error("No active document available to export.");
    }

    // 4. Complete workspace markdown bundle
    if (scope === "workspace") {
      const notes = await ipcBridge.listGeneralNotes();
      const parts: string[] = [];

      // DSM
      if (dsmDoc) {
        parts.push(exportFullDsmToMarkdown(dsmDoc, markdownOptions));
        parts.push("\n\n---\n\n");
      }

      // General notes
      for (const meta of notes) {
        const fullNote = await ipcBridge.readGeneralNote(meta.id);
        parts.push(exportNoteToMarkdown(fullNote, markdownOptions));
        parts.push("\n\n---\n\n");
      }

      return {
        markdown: parts.join(""),
        defaultFilename: "chronote-workspace-export",
      };
    }

    throw new Error(`Invalid export scope: ${scope}`);
  }

  /**
   * Internal helper: builds DOCX Document instance based on scope.
   */
  private async buildDocxDocument(
    params: ExportExecutionParams
  ): Promise<{ doc: any; defaultFilename: string }> {
    const { scope, docxOptions, dateRange, selectedEntryDate } = params;
    const { activeTabId } = useTabsStore.getState();
    const { dsmDoc } = useDsmStore.getState();
    const { activeNote } = useNotesStore.getState();

    // 1. Single DSM entry
    if (scope === "dsmEntry" && selectedEntryDate) {
      const entry = dsmDoc?.entries.find((e) => e.date === selectedEntryDate);
      if (!entry) throw new Error(`DSM entry for date ${selectedEntryDate} not found.`);
      return {
        doc: buildDsmEntryDocx(entry, docxOptions),
        defaultFilename: `dsm-${selectedEntryDate}`,
      };
    }

    // 2. DSM Date range
    if (scope === "dsmRange" && dsmDoc) {
      return {
        doc: buildDsmRangeDocx(dsmDoc.entries, dateRange, docxOptions),
        defaultFilename: dateRange
          ? `dsm-range-${dateRange.from}-to-${dateRange.to}`
          : "dsm-journal",
      };
    }

    // 3. Active document
    if (scope === "activeDocument") {
      if (activeTabId === DSM_TAB_ID) {
        if (!dsmDoc) throw new Error("DSM journal is not loaded.");
        return {
          doc: buildDsmRangeDocx(dsmDoc.entries, undefined, docxOptions),
          defaultFilename: "dsm-journal",
        };
      }

      let note: GeneralNote | null = activeNote;
      if (!note) {
        const tab = useTabsStore.getState().tabs.find((t) => t.id === activeTabId);
        if (tab?.documentType === "general") {
          note = await ipcBridge.readGeneralNote(tab.documentId);
        }
      }

      if (!note) throw new Error("No active document available to export.");

      return {
        doc: buildNoteDocx(note, docxOptions),
        defaultFilename: sanitizeTitleToFilename(note.title),
      };
    }

    // 4. Entire workspace DOCX
    if (scope === "workspace") {
      if (dsmDoc) {
        return {
          doc: buildDsmRangeDocx(dsmDoc.entries, undefined, docxOptions),
          defaultFilename: "chronote-workspace",
        };
      }
    }

    throw new Error(`Invalid export scope for docx: ${scope}`);
  }
}

export const exportService = new ExportService();
