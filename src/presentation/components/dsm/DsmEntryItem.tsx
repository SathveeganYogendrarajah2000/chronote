import React from "react";
import type { DsmEntry } from "@domain/dsm.types";
import { DsmEntryHeader } from "./DsmEntryHeader";
import { DsmSummaryPreview } from "./DsmSummaryPreview";
import { DsmEntryEditor } from "./DsmEntryEditor";
import { useDsmStore, getTodayIsoDate } from "@application/stores/useDsmStore";

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
    updateEntryText,
  } = useDsmStore();

  const isToday = entry.date === getTodayIsoDate();
  const isHighlighted = highlightedDate === entry.date;

  return (
    <article
      id={`dsm-entry-${entry.date}`}
      className={`dsm-entry-card ${entry.collapsed ? "is-collapsed" : "is-expanded"} ${
        isToday ? "is-today" : ""
      } ${isHighlighted ? "is-highlighted" : ""}`}
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
          content={entry.content}
          onUpdateText={(text) => updateEntryText(entry.id, text)}
        />
      )}
    </article>
  );
};
