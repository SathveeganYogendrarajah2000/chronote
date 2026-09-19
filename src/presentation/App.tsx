import React, { useEffect } from "react";
import "./styles/tokens.css";
import "./styles/reset.css";
import "./styles/layout.css";
import "./styles/dsm.css";
import "./styles/notes.css";
import "./styles/editor.css";
import "./styles/search.css";
import "./styles/export.css";
import "./styles/print.css";

import { AppHeader } from "./components/layout/AppHeader";
import { NavigationSidebar } from "./components/layout/NavigationSidebar";
import { TabBar } from "./components/layout/TabBar";
import { MainContentArea } from "./components/layout/MainContentArea";
import { ResourcePane } from "./components/layout/ResourcePane";
import { WorkspaceModal } from "./components/workspace/WorkspaceModal";
import { NoteDeleteModal } from "./components/notes/NoteDeleteModal";
import { SearchModal } from "./components/search/SearchModal";
import { ExportModal } from "./components/export/ExportModal";

import { useUiStore } from "@application/stores/useUiStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { useDsmStore, getTodayIsoDate } from "@application/stores/useDsmStore";
import { useNotesStore } from "@application/stores/useNotesStore";
import { DSM_TAB_ID } from "@domain/tabs.types";

export const App: React.FC = () => {
  const { toggleSidebar, setSearchModalOpen, setExportModalOpen } = useUiStore();
  const { tabs, activeTabId, switchTab, closeTab, reopenClosedTab } = useTabsStore();
  const { init: initWorkspace } = useWorkspaceStore();

  // Initialize workspace from background on startup
  useEffect(() => {
    void initWorkspace();
  }, [initWorkspace]);

  // Register global desktop keyboard accelerators (EDITOR_SPEC.md Section 6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F: Search
      if (e.ctrlKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
      // Ctrl+E: Export Dialog
      else if (e.ctrlKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setExportModalOpen(true);
      }
      // Ctrl+N: New Note
      else if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        void useNotesStore.getState().createNote();
      }
      // Ctrl+Shift+D: Jump to DSM Today
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        switchTab(DSM_TAB_ID);
        useDsmStore.getState().jumpToDate(getTodayIsoDate());
      }
      // Ctrl+\: Toggle Sidebar
      else if (e.ctrlKey && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
      }
      // Ctrl+W: Close active tab
      else if (e.ctrlKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        closeTab(activeTabId);
      }
      // Ctrl+Shift+T: Reopen closed tab
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        reopenClosedTab();
      }
      // Ctrl+Tab: Next tab
      else if (e.ctrlKey && !e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
        if (currentIndex !== -1 && tabs.length > 1) {
          const nextIndex = (currentIndex + 1) % tabs.length;
          const nextTab = tabs[nextIndex];
          if (nextTab) switchTab(nextTab.id);
        }
      }
      // Ctrl+Shift+Tab: Previous tab
      else if (e.ctrlKey && e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
        if (currentIndex !== -1 && tabs.length > 1) {
          const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          const prevTab = tabs[prevIndex];
          if (prevTab) switchTab(prevTab.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTabId,
    tabs,
    switchTab,
    closeTab,
    reopenClosedTab,
    toggleSidebar,
    setSearchModalOpen,
    setExportModalOpen,
  ]);

  return (
    <div className="app-container">
      <AppHeader />
      <div className="app-body">
        <NavigationSidebar />
        <div className="main-workspace">
          <TabBar />
          <MainContentArea />
        </div>
        <ResourcePane />
      </div>
      <WorkspaceModal />
      <NoteDeleteModal />
      <SearchModal />
      <ExportModal />
    </div>
  );
};
