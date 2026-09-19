import React, { useEffect } from "react";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useNotesStore } from "@application/stores/useNotesStore";
import { DsmTimeline } from "../dsm/DsmTimeline";
import { NoteEditorCanvas } from "../notes/NoteEditorCanvas";

export const MainContentArea: React.FC = () => {
  const { tabs, activeTabId } = useTabsStore();
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const isDsm = activeTab?.documentType === "dsm";

  useEffect(() => {
    if (activeTab && activeTab.documentType === "general") {
      void useNotesStore.getState().loadNote(activeTab.documentId);
    }
  }, [activeTab?.documentId, activeTab?.documentType]);

  return (
    <main className="content-viewport">
      {isDsm ? <DsmTimeline /> : <NoteEditorCanvas />}
    </main>
  );
};
