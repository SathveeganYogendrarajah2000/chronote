import React, { useMemo } from "react";
import { useNotesStore } from "@application/stores/useNotesStore";
import { proseMirrorDocToText } from "@domain/note.utils";
import { NoteEditorHeader } from "./NoteEditorHeader";
import { NoteTagBar } from "./NoteTagBar";

export const NoteEditorCanvas: React.FC = () => {
  const { activeNote, isLoading, updateContentText } = useNotesStore();

  const textContent = useMemo(() => {
    if (!activeNote) return "";
    return proseMirrorDocToText(activeNote.content);
  }, [activeNote?.id, activeNote?.content]);

  if (isLoading) {
    return (
      <div className="note-canvas-container" style={{ opacity: 0.6 }}>
        <div style={{ height: 40, backgroundColor: "var(--bg-surface)", borderRadius: 6 }} />
        <div style={{ height: 28, width: 200, backgroundColor: "var(--bg-surface)", borderRadius: 14 }} />
        <div style={{ height: 350, backgroundColor: "var(--bg-surface)", borderRadius: 8 }} />
      </div>
    );
  }

  if (!activeNote) {
    return (
      <div className="note-canvas-container" style={{ textAlign: "center", padding: "var(--space-8)" }}>
        <p style={{ color: "var(--text-muted)" }}>No note selected or note has been removed.</p>
      </div>
    );
  }

  // Calculate quick stats
  const charCount = textContent.length;
  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;

  return (
    <div className="note-canvas-container">
      <NoteEditorHeader />
      <NoteTagBar />

      <div className="note-editor-content">
        <textarea
          className="note-textarea-canvas"
          placeholder="Start writing technical documentation, architecture notes, code references..."
          value={textContent}
          onChange={(e) => updateContentText(e.target.value)}
        />

        <div className="note-editor-footer">
          <span>
            {wordCount} {wordCount === 1 ? "word" : "words"} • {charCount} characters
          </span>
          <span style={{ fontFamily: "var(--font-mono)", opacity: 0.8 }}>
            ID: {activeNote.id}
          </span>
        </div>

        <div className="note-milestone-notice">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
          </svg>
          <span>
            <strong>Next Milestone (1.5):</strong> Full Tiptap 3.x rich-text editor with instant Markdown triggers (<code>#</code>, <code>- </code>, <code>```</code>), first-class code blocks, and internal wiki-links (<code>[[Note]]</code>).
          </span>
        </div>
      </div>
    </div>
  );
};
