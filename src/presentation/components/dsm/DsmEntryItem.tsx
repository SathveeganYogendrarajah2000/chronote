import React, { useState } from "react";
import type { DsmEntry } from "@domain/dsm.types";
import type { ProseMirrorNode } from "@domain/document.types";
import { DsmEntryHeader } from "./DsmEntryHeader";
import { DsmSummaryPreview } from "./DsmSummaryPreview";
import { DsmEntryEditor } from "./DsmEntryEditor";
import { useDsmStore, getTodayIsoDate } from "@application/stores/useDsmStore";
import { navigateToNoteOrDsm } from "@application/navigationHelper";

interface DsmEntryItemProps {
  entry: DsmEntry;
}

export const DsmEntryItem: React.FC<DsmEntryItemProps> = ({ entry }) => {
  const {
    highlightedDate,
    toggleEntryCollapse,
    addEntryTag,
    removeEntryTag,
    deleteEntry,
    updateEntryContent,
  } = useDsmStore();

  const [isCardDragOver, setIsCardDragOver] = useState(false);

  const isToday = entry.date === getTodayIsoDate();
  const isHighlighted = highlightedDate === entry.date;

  const handleNavigateToNote = (targetNoteId: string) => {
    void navigateToNoteOrDsm(targetNoteId);
  };

  const handleCardDragOver = (e: React.DragEvent<HTMLElement>) => {
    if (e.dataTransfer.types.includes("application/x-chronote-note")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!isCardDragOver) setIsCardDragOver(true);
    }
  };

  const handleCardDragLeave = (e: React.DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsCardDragOver(false);
    }
  };

  const handleCardDrop = (e: React.DragEvent<HTMLElement>) => {
    setIsCardDragOver(false);
    if (e.defaultPrevented) return;

    const rawNoteData = e.dataTransfer.getData("application/x-chronote-note");
    if (rawNoteData) {
      try {
        const { id, title } = JSON.parse(rawNoteData);
        if (id && title) {
          e.preventDefault();
          if (entry.collapsed) {
            toggleEntryCollapse(entry.id);
          }

          const newParagraph: ProseMirrorNode = {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: title,
                marks: [
                  {
                    type: "internalLink",
                    attrs: {
                      targetNoteId: id,
                      originalTitle: title,
                    },
                  },
                ],
              },
              {
                type: "text",
                text: " ",
              },
            ],
          };

          const existingContent = entry.content?.content ? [...entry.content.content] : [];
          const updatedContent: ProseMirrorNode = {
            type: "doc",
            content: [...existingContent, newParagraph],
          };

          updateEntryContent(entry.id, updatedContent);
        }
      } catch (err) {
        console.error("Failed to drop note onto DSM entry card:", err);
      }
    }
  };

  return (
    <article
      id={`dsm-entry-${entry.date}`}
      className={`dsm-entry-card ${entry.collapsed ? "is-collapsed" : "is-expanded"} ${
        isToday ? "is-today" : ""
      } ${isHighlighted ? "is-highlighted" : ""} ${isCardDragOver ? "is-drag-over" : ""}`}
      onDragOver={handleCardDragOver}
      onDragLeave={handleCardDragLeave}
      onDrop={handleCardDrop}
    >
      <DsmEntryHeader
        date={entry.date}
        tags={entry.tags}
        collapsed={entry.collapsed}
        onToggleCollapse={() => toggleEntryCollapse(entry.id)}
        onAddTag={(tag) => addEntryTag(entry.id, tag)}
        onRemoveTag={(tag) => removeEntryTag(entry.id, tag)}
        onDeleteEntry={() => void deleteEntry(entry.id)}
      />

      {entry.collapsed ? (
        <DsmSummaryPreview
          content={entry.content}
          onExpand={() => toggleEntryCollapse(entry.id)}
        />
      ) : (
        <DsmEntryEditor
          date={entry.date}
          content={entry.content}
          onUpdateContent={(content) => updateEntryContent(entry.id, content)}
          onNavigateToNote={handleNavigateToNote}
        />
      )}
    </article>
  );
};
