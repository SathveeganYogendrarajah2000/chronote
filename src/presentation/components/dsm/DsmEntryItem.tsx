import React from "react";
import type { DsmEntry } from "@domain/dsm.types";
import { DsmEntryHeader } from "./DsmEntryHeader";
import { DsmSummaryPreview } from "./DsmSummaryPreview";
import { DsmEntryEditor } from "./DsmEntryEditor";
import { useDsmStore, getTodayIsoDate } from "@application/stores/useDsmStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { useNotesStore } from "@application/stores/useNotesStore";
import { DSM_TAB_ID } from "@domain/tabs.types";

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
    updateEntryText,
  } = useDsmStore();

  const isToday = entry.date === getTodayIsoDate();
  const isHighlighted = highlightedDate === entry.date;

  const handleNavigateToNote = (targetNoteId: string) => {
    if (targetNoteId.startsWith("dsm:")) {
      const date = targetNoteId.replace("dsm:", "");
      useTabsStore.getState().switchTab(DSM_TAB_ID);
      useDsmStore.getState().jumpToDate(date);
      return;
    }

    const noteMeta = useWorkspaceStore.getState().recentNotes.find((n) => n.id === targetNoteId);
    const title = noteMeta ? noteMeta.title : "Note";

    useTabsStore.getState().openTab({
      id: `tab_${targetNoteId}`,
      documentId: targetNoteId,
      documentType: "general",
      title,
    });
    void useNotesStore.getState().loadNote(targetNoteId);
  };

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
          onUpdateContent={(content) => updateEntryContent(entry.id, content)}
          onUpdateText={(text) => updateEntryText(entry.id, text)}
          onNavigateToNote={handleNavigateToNote}
        />
      )}
    </article>
  );
};
