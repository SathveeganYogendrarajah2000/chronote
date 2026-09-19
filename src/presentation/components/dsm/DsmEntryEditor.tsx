import React from "react";
import type { ProseMirrorNode } from "@domain/document.types";
import { ChronoteEditor } from "@presentation/editor/ChronoteEditor";

interface DsmEntryEditorProps {
  content: ProseMirrorNode;
  onUpdateContent?: (content: ProseMirrorNode) => void;
  onUpdateText?: (text: string) => void;
  onNavigateToNote?: (targetNoteId: string) => void;
}

export const DsmEntryEditor: React.FC<DsmEntryEditorProps> = ({
  content,
  onUpdateContent,
  onUpdateText,
  onNavigateToNote,
}) => {
  return (
    <div className="dsm-content-area">
      <ChronoteEditor
        content={content}
        placeholder="What did you work on today? (Investigations, PRs, queries, commands, blockers...)"
        onChange={(newContent: ProseMirrorNode, plainText: string) => {
          if (onUpdateContent) onUpdateContent(newContent);
          if (onUpdateText) onUpdateText(plainText);
        }}
        onNavigateToNote={onNavigateToNote}
      />
    </div>
  );
};
