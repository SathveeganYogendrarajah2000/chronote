import React, { useState, useEffect } from "react";
import { useUiStore } from "@application/stores/useUiStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useDsmStore, getTodayIsoDate } from "@application/stores/useDsmStore";
import { useNotesStore } from "@application/stores/useNotesStore";
import { exportService } from "@application/services/exportService";
import type { ExportFormat, ExportScope } from "@domain/export/export.types";
import { DSM_TAB_ID } from "@domain/tabs.types";

export const ExportModal: React.FC = () => {
  const { exportModalOpen, exportInitialScope, setExportModalOpen } = useUiStore();
  const { activeTabId, tabs } = useTabsStore();
  const { dsmDoc } = useDsmStore();
  const { activeNote } = useNotesStore();

  const [format, setFormat] = useState<ExportFormat>("markdown");
  const [scope, setScope] = useState<ExportScope>("activeDocument");
  const [wikiLinkMode, setWikiLinkMode] = useState<boolean>(false);
  const [includeTags, setIncludeTags] = useState<boolean>(true);
  const [includeFrontmatter, setIncludeFrontmatter] = useState<boolean>(false);
  const [selectedEntryDate, setSelectedEntryDate] = useState<string>(getTodayIsoDate());
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initialize scope and date defaults when modal opens
  useEffect(() => {
    if (exportModalOpen) {
      setStatusMessage(null);
      if (exportInitialScope) {
        setScope(exportInitialScope);
        if (exportInitialScope === "workspace") {
          setFormat("zip");
        }
      } else {
        setScope("activeDocument");
        setFormat("markdown");
      }

      if (dsmDoc?.entries && dsmDoc.entries.length > 0) {
        const sorted = [...dsmDoc.entries].sort((a, b) => b.date.localeCompare(a.date));
        setSelectedEntryDate(sorted[0].date);
        setDateTo(sorted[0].date);
        setDateFrom(sorted[Math.min(sorted.length - 1, 6)].date);
      }
    }
  }, [exportModalOpen, exportInitialScope, dsmDoc]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && exportModalOpen) {
        setExportModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exportModalOpen, setExportModalOpen]);

  if (!exportModalOpen) return null;

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeDocumentLabel =
    activeTabId === DSM_TAB_ID
      ? "Daily Stand-up Journal"
      : activeNote?.title || activeTab?.title || "Active Note";

  const handleSelectFormat = (fmt: ExportFormat) => {
    setFormat(fmt);
    setStatusMessage(null);
    if (fmt === "zip") {
      setScope("workspace");
    } else if (scope === "workspace") {
      setScope("activeDocument");
    }
  };

  const handleExecuteExport = async (copyToClipboard: boolean = false) => {
    setLoading(true);
    setStatusMessage(null);

    try {
      const result = await exportService.executeExport({
        format,
        scope,
        copyToClipboard,
        selectedEntryDate,
        dateRange:
          scope === "dsmRange" && dateFrom && dateTo
            ? { from: dateFrom, to: dateTo }
            : undefined,
        markdownOptions: {
          wikiLinkMode,
          includeTags,
          includeFrontmatter,
          includeTitle: true,
        },
        docxOptions: {
          includeTags,
          includeTitle: true,
        },
      });

      if (result.success) {
        setStatusMessage({
          type: "success",
          text: result.message || "Export completed successfully!",
        });
        if (copyToClipboard) {
          setTimeout(() => {
            setExportModalOpen(false);
          }, 1200);
        }
      } else {
        setStatusMessage({
          type: "error",
          text: result.message || "Export failed.",
        });
      }
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="export-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) setExportModalOpen(false);
      }}
    >
      <div className="export-modal-card" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="export-modal-header">
          <div className="export-modal-title">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
              <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V10.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z" />
            </svg>
            <span>Export Notes & Backups</span>
          </div>
          <button
            type="button"
            className="search-close-btn"
            onClick={() => setExportModalOpen(false)}
            title="Close (Escape)"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="export-modal-body">
          {/* Format Selection Grid */}
          <div>
            <div className="export-section-label">Target Format</div>
            <div className="export-formats-grid">
              <div
                className={`export-format-card ${format === "markdown" ? "active" : ""}`}
                onClick={() => handleSelectFormat("markdown")}
              >
                <div className="export-format-icon">📝</div>
                <div className="export-format-name">Markdown</div>
                <div className="export-format-ext">.md (GFM)</div>
              </div>

              <div
                className={`export-format-card ${format === "docx" ? "active" : ""}`}
                onClick={() => handleSelectFormat("docx")}
              >
                <div className="export-format-icon">📄</div>
                <div className="export-format-name">Word</div>
                <div className="export-format-ext">.docx</div>
              </div>

              <div
                className={`export-format-card ${format === "pdf" ? "active" : ""}`}
                onClick={() => handleSelectFormat("pdf")}
              >
                <div className="export-format-icon">🖨️</div>
                <div className="export-format-name">Print / PDF</div>
                <div className="export-format-ext">.pdf</div>
              </div>

              <div
                className={`export-format-card ${format === "zip" ? "active" : ""}`}
                onClick={() => handleSelectFormat("zip")}
              >
                <div className="export-format-icon">📦</div>
                <div className="export-format-name">Backup</div>
                <div className="export-format-ext">.zip container</div>
              </div>
            </div>
          </div>

          {/* Scope Selection */}
          {format !== "zip" ? (
            <div>
              <div className="export-section-label">Export Scope</div>
              <div className="export-scopes-list">
                {/* Active Document */}
                <label className={`export-scope-option ${scope === "activeDocument" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="exportScope"
                    value="activeDocument"
                    checked={scope === "activeDocument"}
                    onChange={() => setScope("activeDocument")}
                  />
                  <div className="export-scope-details">
                    <span className="export-scope-title">Active Document</span>
                    <span className="export-scope-desc">{activeDocumentLabel}</span>
                  </div>
                </label>

                {/* Single DSM Entry */}
                <label className={`export-scope-option ${scope === "dsmEntry" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="exportScope"
                    value="dsmEntry"
                    checked={scope === "dsmEntry"}
                    onChange={() => setScope("dsmEntry")}
                  />
                  <div className="export-scope-details" style={{ width: "100%" }}>
                    <span className="export-scope-title">Single Stand-up Entry</span>
                    <span className="export-scope-desc">Ideal for posting into Slack or Jira daily updates</span>
                    {scope === "dsmEntry" && (
                      <div style={{ marginTop: 6 }}>
                        <select
                          className="export-date-input"
                          value={selectedEntryDate}
                          onChange={(e) => setSelectedEntryDate(e.target.value)}
                        >
                          {dsmDoc?.entries.map((ent) => (
                            <option key={ent.id} value={ent.date}>
                              {ent.date} {ent.tags.length > 0 ? `(${ent.tags.join(", ")})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </label>

                {/* DSM Date Range */}
                <label className={`export-scope-option ${scope === "dsmRange" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="exportScope"
                    value="dsmRange"
                    checked={scope === "dsmRange"}
                    onChange={() => setScope("dsmRange")}
                  />
                  <div className="export-scope-details">
                    <span className="export-scope-title">Stand-up Sprint / Date Range</span>
                    <span className="export-scope-desc">Multi-day sprint summary from start date to end date</span>
                    {scope === "dsmRange" && (
                      <div className="export-range-inputs">
                        <input
                          type="date"
                          className="export-date-input"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>to</span>
                        <input
                          type="date"
                          className="export-date-input"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </label>

                {/* Complete Workspace */}
                {format === "markdown" && (
                  <label className={`export-scope-option ${scope === "workspace" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="exportScope"
                      value="workspace"
                      checked={scope === "workspace"}
                      onChange={() => setScope("workspace")}
                    />
                    <div className="export-scope-details">
                      <span className="export-scope-title">All Workspace Notes</span>
                      <span className="export-scope-desc">Consolidated Markdown bundle of all stand-ups and general notes</span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="export-section-label">Backup Information</div>
              <div className="export-options-box" style={{ fontSize: "var(--font-size-xs)", lineHeight: 1.6 }}>
                <div>
                  <strong>Complete Lossless Workspace Archive:</strong>
                </div>
                <div style={{ color: "var(--text-secondary)" }}>
                  Creates a standard <code>.zip</code> container packaging <code>workspace.json</code>, the entire DSM journal, all General notes, image assets, and file attachments with an archive <code>manifest.json</code>.
                </div>
                <div style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                  * The rebuildable <code>.chronote/index.db</code> SQLite cache and temporary files are strictly excluded.
                </div>
              </div>
            </div>
          )}

          {/* Formatting Options Box */}
          {format === "markdown" && (
            <div>
              <div className="export-section-label">Markdown Options</div>
              <div className="export-options-box">
                <label className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={wikiLinkMode}
                    onChange={(e) => setWikiLinkMode(e.target.checked)}
                  />
                  <span>
                    Preserve Wiki-links syntax (<code>[[Note Title]]</code>) for Obsidian / Foam
                  </span>
                </label>
                <label className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeTags}
                    onChange={(e) => setIncludeTags(e.target.checked)}
                  />
                  <span>
                    Include formatted tags metadata callout (<code>&gt; Tags: #...</code>)
                  </span>
                </label>
                <label className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeFrontmatter}
                    onChange={(e) => setIncludeFrontmatter(e.target.checked)}
                  />
                  <span>Include YAML frontmatter block at top</span>
                </label>
              </div>
            </div>
          )}

          {format === "docx" && (
            <div>
              <div className="export-section-label">Word (.docx) Options</div>
              <div className="export-options-box">
                <label className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeTags}
                    onChange={(e) => setIncludeTags(e.target.checked)}
                  />
                  <span>Include tags callout header</span>
                </label>
              </div>
            </div>
          )}

          {/* Status Message Banner */}
          {statusMessage && (
            <div className={`export-status-banner ${statusMessage.type}`}>
              <span>{statusMessage.type === "success" ? "✓" : "⚠"}</span>
              <span style={{ wordBreak: "break-all" }}>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="export-modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setExportModalOpen(false)}
            disabled={loading}
          >
            Cancel
          </button>

          <div className="export-footer-actions">
            {format === "markdown" && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void handleExecuteExport(true)}
                disabled={loading}
                title="Copy formatted Markdown directly to system clipboard"
              >
                📋 Copy to Clipboard
              </button>
            )}

            <button
              type="button"
              className="btn-primary-action"
              onClick={() => void handleExecuteExport(false)}
              disabled={loading}
            >
              {loading ? (
                <span>Exporting...</span>
              ) : format === "pdf" ? (
                <span>Print / Save as PDF</span>
              ) : format === "zip" ? (
                <span>Generate Backup (.zip)</span>
              ) : (
                <span>Export & Save File</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
