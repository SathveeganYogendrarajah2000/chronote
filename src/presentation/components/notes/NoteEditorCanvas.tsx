import React, { useMemo, useEffect } from "react";
import { useNotesStore } from "@application/stores/useNotesStore";
import { useTocStore } from "@application/stores/useTocStore";
import { proseMirrorDocToText } from "@domain/note.utils";
import { NoteEditorHeader } from "./NoteEditorHeader";
import { NoteTagBar } from "./NoteTagBar";
import { ChronoteEditor } from "@presentation/editor/ChronoteEditor";
import type { ProseMirrorNode } from "@domain/document.types";
import { navigateToNoteOrDsm } from "@application/navigationHelper";

export const NoteEditorCanvas: React.FC = () => {
  const { activeNote, isLoading, updateContent } = useNotesStore();
  const { setActiveContext } = useTocStore();

  useEffect(() => {
    if (activeNote) {
      setActiveContext({
        source: "general",
        documentId: activeNote.id,
        title: activeNote.title,
      });
    }
  }, [activeNote?.id, activeNote?.title, setActiveContext]);

  const textContent = useMemo(() => {
    if (!activeNote) return "";
    return proseMirrorDocToText(activeNote.content);
  }, [activeNote?.id, activeNote?.content]);

  const handleNavigateToNote = (targetNoteId: string) => {
    void navigateToNoteOrDsm(targetNoteId);
  };

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
        <ChronoteEditor
          content={activeNote.content}
          onChange={(newContent: ProseMirrorNode) => updateContent(newContent)}
          onNavigateToNote={handleNavigateToNote}
          onEditorFocus={() => {
            setActiveContext({
              source: "general",
              documentId: activeNote.id,
              title: activeNote.title,
            });
          }}
        />

        <div className="note-editor-footer">
          <span>
            {wordCount} {wordCount === 1 ? "word" : "words"} • {charCount} characters
          </span>
          <span style={{ fontFamily: "var(--font-mono)", opacity: 0.8 }}>
            ID: {activeNote.id}
          </span>
        </div>
      </div>
    </div>
  );
};
