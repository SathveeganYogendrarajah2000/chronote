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
import "./styles/performance.css";
import "./styles/conflict.css";
import "./styles/toc.css";
import "./styles/courses.css";
import "./styles/bin.css";
import "./styles/cloudSync.css";
import "./styles/graph.css";

import { AppHeader } from "./components/layout/AppHeader";
import { NavigationSidebar } from "./components/layout/NavigationSidebar";
import { TabBar } from "./components/layout/TabBar";
import { MainContentArea } from "./components/layout/MainContentArea";
import { ResourcePane } from "./components/layout/ResourcePane";
import { WorkspaceModal } from "./components/workspace/WorkspaceModal";
import { NoteDeleteModal } from "./components/notes/NoteDeleteModal";
import { BinModal } from "./components/bin/BinModal";
import { SearchModal } from "./components/search/SearchModal";
import { ExportModal } from "./components/export/ExportModal";
import { PerformanceModal } from "./components/performance/PerformanceModal";
import { ConflictModal } from "./components/conflict/ConflictModal";
import { TopicModal } from "./components/courses/TopicModal";
import { ResourceModal } from "./components/courses/ResourceModal";
import { CloudSyncModal } from "./components/cloud/CloudSyncModal";

import { useUiStore } from "@application/stores/useUiStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { useDsmStore, getTodayIsoDate } from "@application/stores/useDsmStore";
import { useNotesStore } from "@application/stores/useNotesStore";
import { useConflictStore } from "@application/stores/useConflictStore";
import { performanceProfiler } from "@application/services/performanceProfiler";
import { DSM_TAB_ID, GRAPH_TAB_ID, GRAPH_DOCUMENT_ID } from "@domain/tabs.types";

export const App: React.FC = () => {
  const {
    toggleSidebar,
    setSearchModalOpen,
    setExportModalOpen,
    setPerformanceModalOpen,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomNotification,
  } = useUiStore();
  const { tabs, activeTabId, switchTab, closeTab, reopenClosedTab } = useTabsStore();
  const { init: initWorkspace } = useWorkspaceStore();
  const { scanConflicts } = useConflictStore();

  // Initialize workspace and external sync conflict detection on startup
  useEffect(() => {
    performanceProfiler.mark("app_mount");
    void initWorkspace().then(() => {
      performanceProfiler.mark("workspace_ready");
      void scanConflicts();
    });

    const handleWindowFocus = () => {
      void scanConflicts();
    };

    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, [initWorkspace, scanConflicts]);

  // Register global desktop keyboard accelerators (EDITOR_SPEC.md Section 6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F: Search
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
      // Ctrl+E: Export Dialog
      else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setExportModalOpen(true);
      }
      // Ctrl+Shift+P: Performance Diagnostics
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPerformanceModalOpen(true);
      }
      // Ctrl+N: New Note
      else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        void useNotesStore.getState().createNote();
      }
      // Ctrl+Shift+D: Jump to DSM Today
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        switchTab(DSM_TAB_ID);
        useDsmStore.getState().jumpToDate(getTodayIsoDate());
      }
      // Ctrl+G: Open Backlinks Graph Explorer
      else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        const hasTab = tabs.find((t) => t.id === GRAPH_TAB_ID);
        if (hasTab) {
          switchTab(GRAPH_TAB_ID);
        } else {
          useTabsStore.getState().openTab({
            id: GRAPH_TAB_ID,
            documentId: GRAPH_DOCUMENT_ID,
            documentType: "graph",
            title: "Backlinks Graph",
          });
        }
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
      // Ctrl+= or Ctrl++: Zoom In
      else if (e.ctrlKey && !e.shiftKey && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoomIn();
      }
      // Ctrl+-: Zoom Out
      else if (e.ctrlKey && !e.shiftKey && e.key === "-") {
        e.preventDefault();
        zoomOut();
      }
      // Ctrl+0: Reset Zoom
      else if (e.ctrlKey && !e.shiftKey && e.key === "0") {
        e.preventDefault();
        resetZoom();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          zoomIn();
        } else if (e.deltaY > 0) {
          zoomOut();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [
    activeTabId,
    tabs,
    switchTab,
    closeTab,
    reopenClosedTab,
    toggleSidebar,
    setSearchModalOpen,
    setExportModalOpen,
    setPerformanceModalOpen,
    zoomIn,
    zoomOut,
    resetZoom,
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
      <BinModal />
      <SearchModal />
      <ExportModal />
      <PerformanceModal />
      <ConflictModal />
      <CloudSyncModal />
      <TopicModal />
      <ResourceModal />

      {/* On-screen Zoom HUD Indicator */}
      {zoomNotification && (
        <div className="zoom-hud-indicator">
          <span>{zoomNotification}</span>
        </div>
      )}
    </div>
  );
};
