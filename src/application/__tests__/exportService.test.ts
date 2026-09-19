import { describe, it, expect, beforeEach, vi } from "vitest";
import { exportService } from "../services/exportService";
import { useNotesStore } from "../stores/useNotesStore";
import { useDsmStore } from "../stores/useDsmStore";
import { mockIpcBridge } from "@infrastructure/tauri/mockIpcBridge";

describe("ExportService", () => {
  beforeEach(async () => {
    // Reset stores and create workspace
    const { useWorkspaceStore } = await import("../stores/useWorkspaceStore");
    await useWorkspaceStore.getState().createWorkspace("C:/mock/ws", "Mock WS");

    // Create a note
    await useNotesStore.getState().createNote({
      title: "Spring Boot 3.3 Virtual Threads Investigation",
      tags: ["springboot", "performance"],
      initialText: "Investigating throughput with virtual threads.",
    });

    // Add DSM entries
    const dsm = await mockIpcBridge.readDsmDocument();
    dsm.entries = [
      {
        id: "ent_1",
        date: "2026-09-16",
        tags: ["auth", "jwt"],
        collapsed: false,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Completed JWT token refresh rotation." }],
            },
          ],
        },
        createdAt: "2026-09-16T09:00:00Z",
        updatedAt: "2026-09-16T10:00:00Z",
      },
    ];
    await mockIpcBridge.saveDsmDocument(dsm);
    useDsmStore.setState({ dsmDoc: dsm });
  });

  it("exports active GeneralNote to Markdown and saves via IPC bridge", async () => {
    const result = await exportService.executeExport({
      format: "markdown",
      scope: "activeDocument",
      markdownOptions: {
        wikiLinkMode: false,
        includeTags: true,
        includeTitle: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBeDefined();
    expect(result.filePath).toContain(".md");
    expect(result.byteCount).toBeGreaterThan(50);
  });

  it("copies active document Markdown to clipboard", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const result = await exportService.executeExport({
      format: "markdown",
      scope: "activeDocument",
      copyToClipboard: true,
    });

    expect(result.success).toBe(true);
    expect(result.copiedToClipboard).toBe(true);
    expect(writeTextMock).toHaveBeenCalled();
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain("# Spring Boot 3.3 Virtual Threads Investigation");
  });

  it("exports active GeneralNote to DOCX buffer", async () => {
    const result = await exportService.executeExport({
      format: "docx",
      scope: "activeDocument",
      docxOptions: {
        includeTags: true,
        includeTitle: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBeDefined();
    expect(result.filePath).toContain(".docx");
    expect(result.byteCount).toBeGreaterThan(1000);
  });

  it("triggers PDF print pipeline", async () => {
    const printMock = vi.fn();
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = { print: printMock };

    const result = await exportService.executeExport({
      format: "pdf",
      scope: "activeDocument",
    });

    expect(result.success).toBe(true);
    expect(printMock).toHaveBeenCalled();

    (globalThis as any).window = originalWindow;
  });

  it("exports full workspace zip backup", async () => {
    const result = await exportService.executeExport({
      format: "zip",
      scope: "workspace",
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBeDefined();
    expect(result.filePath).toContain(".zip");
  });

  it("exports DSM date range to Markdown", async () => {
    const result = await exportService.executeExport({
      format: "markdown",
      scope: "dsmRange",
      dateRange: { from: "2026-09-14", to: "2026-09-16" },
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toContain("dsm-range-2026-09-14-to-2026-09-16.md");
  });

  it("exports single DSM date entry to DOCX", async () => {
    const result = await exportService.executeExport({
      format: "docx",
      scope: "dsmEntry",
      selectedEntryDate: "2026-09-16",
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toContain("dsm-2026-09-16.docx");
  });
});
