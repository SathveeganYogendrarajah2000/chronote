import React from "react";
import type { ProseMirrorNode } from "@domain/document.types";
import { ChronoteEditor } from "@presentation/editor/ChronoteEditor";

interface DsmEntryEditorProps {
  content: ProseMirrorNode;
  onUpdateContent?: ((content: ProseMirrorNode) => void) | undefined;
  onNavigateToNote?: ((targetNoteId: string) => void) | undefined;
}

export const DsmEntryEditor: React.FC<DsmEntryEditorProps> = ({
  content,
  onUpdateContent,
  onNavigateToNote,
}) => {
  return (
    <div className="dsm-content-area">
      <ChronoteEditor
        content={content}
        placeholder="What did you work on today? (Investigations, PRs, queries, commands, blockers...)"
        onChange={(newContent: ProseMirrorNode) => {
          if (onUpdateContent) onUpdateContent(newContent);
        }}
        onNavigateToNote={onNavigateToNote}
      />
    </div>
  );
};
