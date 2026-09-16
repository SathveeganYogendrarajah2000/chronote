import React, { useEffect } from "react";
import "./styles/tokens.css";
import "./styles/reset.css";
import "./styles/layout.css";

import { AppHeader } from "./components/layout/AppHeader";
import { NavigationSidebar } from "./components/layout/NavigationSidebar";
import { TabBar } from "./components/layout/TabBar";
import { MainContentArea } from "./components/layout/MainContentArea";
import { ResourcePane } from "./components/layout/ResourcePane";
import { WorkspaceModal } from "./components/workspace/WorkspaceModal";

import { useUiStore } from "@application/stores/useUiStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { DSM_TAB_ID } from "@domain/tabs.types";
import { generateId } from "@domain/id.utils";

export const App: React.FC = () => {
  const { toggleSidebar, setSearchModalOpen } = useUiStore();
  const { tabs, activeTabId, switchTab, closeTab, reopenClosedTab, openTab } = useTabsStore();
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
      // Ctrl+N: New Note
      else if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        const newId = generateId("not");
        openTab({
          id: `tab_${newId}`,
          documentId: newId,
          documentType: "general",
          title: "Untitled Note",
        });
      }
      // Ctrl+Shift+D: Jump to DSM
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        switchTab(DSM_TAB_ID);
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
    openTab,
    toggleSidebar,
    setSearchModalOpen,
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
    </div>
  );
};
