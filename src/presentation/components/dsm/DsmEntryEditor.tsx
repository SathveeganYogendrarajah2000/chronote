import React from "react";
import type { ProseMirrorNode } from "@domain/document.types";
import { ChronoteEditor } from "@presentation/editor/ChronoteEditor";
import { useTocStore } from "@application/stores/useTocStore";

interface DsmEntryEditorProps {
  date: string;
  content: ProseMirrorNode;
  onUpdateContent?: ((content: ProseMirrorNode) => void) | undefined;
  onNavigateToNote?: ((targetNoteId: string) => void) | undefined;
}

export const DsmEntryEditor: React.FC<DsmEntryEditorProps> = ({
  date,
  content,
  onUpdateContent,
  onNavigateToNote,
}) => {
  const { setActiveContext } = useTocStore();

  return (
    <div className="dsm-content-area">
      <ChronoteEditor
        content={content}
        placeholder="What did you work on today? (Investigations, PRs, queries, commands, blockers...)"
        onChange={(newContent: ProseMirrorNode) => {
          if (onUpdateContent) onUpdateContent(newContent);
        }}
        onNavigateToNote={onNavigateToNote}
        onEditorFocus={() => {
          setActiveContext({
            source: "dsm",
            documentId: `dsm_${date}`,
            date,
            title: `Stand-up (${date})`,
          });
        }}
      />
    </div>
  );
};
