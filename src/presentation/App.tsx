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
      // Ctrl+Shift+F: Global Search (Find Mode)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchModalOpen(true, "find");
      }
      // Ctrl+F: Local Search (Active Editor)
      else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent("chronote:open-local-search", { detail: { isReplace: false } })
        );
      }
      // Ctrl+Shift+R: Global Search (Find & Replace Mode)
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        setSearchModalOpen(true, "replace");
      }
      // Ctrl+R: Local Search (Find & Replace Mode)
      else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault(); // Prevents WebView from reloading!
        window.dispatchEvent(
          new CustomEvent("chronote:open-local-search", { detail: { isReplace: true } })
        );
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
      else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
      }
      // Ctrl+Shift+T: Reopen closed tab
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        reopenClosedTab();
      }
      // Ctrl+Tab / Ctrl+Shift+Tab: Cycle tabs
      else if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        if (tabs.length > 1) {
          const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
          if (currentIndex !== -1) {
            const nextIndex = e.shiftKey
              ? (currentIndex - 1 + tabs.length) % tabs.length
              : (currentIndex + 1) % tabs.length;
            const targetTab = tabs[nextIndex];
            if (targetTab) {
              switchTab(targetTab.id);
            }
          }
        }
      }
      // Ctrl+1 to Ctrl+9: Switch to specific tab index
      else if (e.ctrlKey && !e.shiftKey && !e.altKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const tabIndex = parseInt(e.key, 10) - 1;
        if (tabIndex < tabs.length && tabs[tabIndex]) {
          switchTab(tabs[tabIndex].id);
        }
      }
      // Ctrl+= / Ctrl++: Zoom in
      else if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoomIn();
      }
      // Ctrl+-: Zoom out
      else if (e.ctrlKey && e.key === "-") {
        e.preventDefault();
        zoomOut();
      }
      // Ctrl+0: Reset zoom to 100%
      else if (e.ctrlKey && e.key === "0") {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    setSearchModalOpen,
    setExportModalOpen,
    setPerformanceModalOpen,
    toggleSidebar,
    closeTab,
    reopenClosedTab,
    switchTab,
    zoomIn,
    zoomOut,
    resetZoom,
    tabs,
    activeTabId,
  ]);

  return (
    <div className="app-container">
      {/* Zoom HUD Notification */}
      {zoomNotification && (
        <div className="zoom-hud-notification">
          <span>{zoomNotification}</span>
        </div>
      )}

      {/* Top Application Header Bar */}
      <AppHeader />

      {/* Tab Navigation Strip */}
      <TabBar />

      {/* Workspace Main Workspace Split-Pane Body */}
      <div className="app-body">
        <NavigationSidebar />
        <MainContentArea />
        <ResourcePane />
      </div>

      {/* Persistent / Layered Application Modals */}
      <WorkspaceModal />
      <NoteDeleteModal />
      <BinModal />
      <SearchModal />
      <ExportModal />
      <PerformanceModal />
      <ConflictModal />
      <TopicModal />
      <ResourceModal />
      <CloudSyncModal />
    </div>
  );
};
