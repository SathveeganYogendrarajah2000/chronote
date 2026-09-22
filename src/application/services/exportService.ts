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
import {
  exportNoteToHtml,
  exportDsmEntryToHtml,
  exportDsmRangeToHtml,
  exportFullDsmToHtml,
  buildCompletePrintableHtml,
} from "@domain/export/htmlExporter";

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
        return await this.executePdfPrint(params);
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
   * Generates a clean printable HTML document for the given scope and invokes
   * the print pipeline inside an isolated hidden iframe.
   */
  private async executePdfPrint(params: ExportExecutionParams): Promise<ExportResult> {
    try {
      const { html, title } = await this.renderHtmlContent(params);
      const fullHtml = buildCompletePrintableHtml(title, html);

      await this.printHtmlInIsolatedIframe(fullHtml);

      return {
        success: true,
        message: "Print dialog opened. Select 'Save as PDF' to export.",
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Prints HTML in an isolated invisible iframe so the main UI, modals,
   * and sidebars are excluded from the printed document.
   */
  private printHtmlInIsolatedIframe(htmlContent: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof document === "undefined") {
        if (typeof window !== "undefined" && typeof window.print === "function") {
          window.print();
        }
        resolve();
        return;
      }

      try {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        iframe.style.visibility = "hidden";
        iframe.setAttribute("aria-hidden", "true");

        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(htmlContent);
          iframeDoc.close();
        }

        const triggerPrint = () => {
          try {
            if (iframe.contentWindow && typeof iframe.contentWindow.print === "function") {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            } else if (typeof window !== "undefined" && typeof window.print === "function") {
              window.print();
            }
          } catch (e) {
            console.error("Print error:", e);
            if (typeof window !== "undefined" && typeof window.print === "function") {
              window.print();
            }
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              resolve();
            }, 300);
          }
        };

        if (iframe.contentWindow) {
          iframe.contentWindow.onload = () => setTimeout(triggerPrint, 100);
          setTimeout(triggerPrint, 300);
        } else {
          setTimeout(triggerPrint, 300);
        }
      } catch {
        if (typeof window !== "undefined" && typeof window.print === "function") {
          window.print();
        }
        resolve();
      }
    });
  }

  /**
   * Internal helper: renders clean HTML string based on scope.
   */
  private async renderHtmlContent(
    params: ExportExecutionParams
  ): Promise<{ html: string; title: string }> {
    const { scope, dateRange, selectedEntryDate } = params;
    const { activeTabId } = useTabsStore.getState();
    const { dsmDoc } = useDsmStore.getState();
    const { activeNote } = useNotesStore.getState();

    // 1. Single DSM entry
    if (scope === "dsmEntry" && selectedEntryDate) {
      const entry = dsmDoc?.entries.find((e) => e.date === selectedEntryDate);
      if (!entry) throw new Error(`DSM entry for date ${selectedEntryDate} not found.`);
      return {
        html: exportDsmEntryToHtml(entry, { includeTags: true, includeTitle: true }),
        title: `DSM Stand-up — ${selectedEntryDate}`,
      };
    }

    // 2. DSM Date range
    if (scope === "dsmRange" && dsmDoc) {
      const title = dateRange
        ? `DSM Journal (${dateRange.from} to ${dateRange.to})`
        : "DSM Journal";
      return {
        html: exportDsmRangeToHtml(dsmDoc.entries, dateRange, { includeTags: true }),
        title,
      };
    }

    // 3. Active document
    if (scope === "activeDocument") {
      if (activeTabId === DSM_TAB_ID) {
        if (!dsmDoc) throw new Error("DSM journal is not loaded.");
        return {
          html: exportFullDsmToHtml(dsmDoc, { includeTags: true }),
          title: "Daily Stand-up Journal",
        };
      }

      if (activeNote) {
        return {
          html: exportNoteToHtml(activeNote, { includeTags: true, includeTitle: true }),
          title: activeNote.title,
        };
      }

      const tab = useTabsStore.getState().tabs.find((t) => t.id === activeTabId);
      if (tab?.documentType === "general") {
        const note = await ipcBridge.readGeneralNote(tab.documentId);
        return {
          html: exportNoteToHtml(note, { includeTags: true, includeTitle: true }),
          title: note.title,
        };
      }

      throw new Error("No active document available to export.");
    }

    // 4. Complete workspace
    if (scope === "workspace") {
      const notes = await ipcBridge.listGeneralNotes();
      const parts: string[] = [];

      if (dsmDoc && dsmDoc.entries.length > 0) {
        parts.push(exportFullDsmToHtml(dsmDoc, { includeTags: true }));
      }

      for (let i = 0; i < notes.length; i++) {
        const fullNote = await ipcBridge.readGeneralNote(notes[i].id);
        if (parts.length > 0) parts.push('<div class="page-break"></div>');
        parts.push(exportNoteToHtml(fullNote, { includeTags: true, includeTitle: true }));
      }

      return {
        html: parts.join("\n"),
        title: "Chronote Workspace Export",
      };
    }

    throw new Error(`Invalid export scope: ${scope}`);
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
