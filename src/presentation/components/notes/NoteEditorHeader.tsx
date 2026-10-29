import React, { useRef, useEffect, useState, useMemo } from "react";
import { useNotesStore } from "@application/stores/useNotesStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { extractHeadings } from "@domain/toc.utils";
import { FloatingTocPopover } from "../toc/FloatingTocPopover";

export const NoteEditorHeader: React.FC = () => {
  const {
    activeNote,
    isSaving,
    isDirty,
    updateTitle,
    updateSection,
    togglePin,
    setDeleteCandidateId,
  } = useNotesStore();
  const { workspace, recentNotes } = useWorkspaceStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isTocOpen, setIsTocOpen] = useState(false);

  // Auto-focus title if note was newly created ("Untitled Note")
  useEffect(() => {
    if (activeNote && activeNote.title === "Untitled Note") {
      inputRef.current?.select();
    }
  }, [activeNote?.id]);

  const headingsCount = useMemo(() => {
    if (!activeNote) return 0;
    return extractHeadings(activeNote.content).length;
  }, [activeNote?.content]);

  const availableSections = useMemo(() => {
    const set = new Set<string>(["General"]);
    if (workspace?.settings?.customSections) {
      workspace.settings.customSections.forEach((s) => set.add(s));
    }
    if (workspace?.settings?.pinnedSections) {
      workspace.settings.pinnedSections.forEach((s) => set.add(s));
    }
    for (const n of recentNotes) {
      if (n.section?.trim()) set.add(n.section.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [workspace?.settings?.customSections, workspace?.settings?.pinnedSections, recentNotes]);

  if (!activeNote) return null;

  const formattedDate = new Date(activeNote.updatedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="note-editor-header">
      <div className="note-title-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="note-title-input"
          value={activeNote.title}
          placeholder="Untitled Note"
          onChange={(e) => updateTitle(e.target.value)}
          title="Click to rename note"
        />
        <div className="note-header-meta">
          <span>Updated {formattedDate}</span>
          <span>•</span>
          <span
            className="note-header-section-badge"
            title="Folder / Section"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.8 }}>
              <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
            </svg>
            <select
              value={activeNote.section || "General"}
              onChange={(e) => updateSection(e.target.value)}
              className="note-section-select"
              aria-label="Note section"
              title="Folder / Section"
              style={{
                background: "var(--bg-secondary, rgba(255, 255, 255, 0.05))",
                color: "var(--text-primary)",
                border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
                borderRadius: "4px",
                padding: "1px 4px",
                fontSize: "11px",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </span>
          <span>•</span>
          <span
            className={`note-save-badge ${isSaving || isDirty ? "saving" : ""}`}
            title={isSaving ? "Saving changes..." : isDirty ? "Unsaved changes" : "All changes saved to disk"}
          >
            {isSaving ? (
              <>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
                </svg>
                <span>Saving...</span>
              </>
            ) : isDirty ? (
              <span>• Unsaved</span>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                </svg>
                <span>Saved</span>
              </>
            )}
          </span>
        </div>
      </div>

      <div className="note-header-actions">
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="note-action-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 6px" }}
            onClick={() => setIsTocOpen(!isTocOpen)}
            title={`Table of Contents (${headingsCount} headings)`}
            aria-label="Table of Contents"
          >
            <span>📑</span>
            {headingsCount > 0 && (
              <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", opacity: 0.85 }}>
                {headingsCount}
              </span>
            )}
          </button>
          <FloatingTocPopover
            isOpen={isTocOpen}
            onClose={() => setIsTocOpen(false)}
            title={activeNote.title}
          />
        </div>

        <button
          type="button"
          className={`note-action-btn ${activeNote.pinned ? "pinned" : ""}`}
          onClick={() => togglePin(activeNote.id)}
          title={activeNote.pinned ? "Unpin note from top" : "Pin note to top of list"}
          aria-pressed={activeNote.pinned}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z" />
          </svg>
        </button>

        <button
          type="button"
          className="note-action-btn danger"
          onClick={() => setDeleteCandidateId(activeNote.id)}
          title="Delete note..."
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
            <path
              fillRule="evenodd"
              d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
