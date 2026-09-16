import React from "react";
import { useUiStore } from "@application/stores/useUiStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { IconButton } from "../common/IconButton";
import { generateId } from "@domain/id.utils";

export const AppHeader: React.FC = () => {
  const {
    sidebarCollapsed,
    toggleSidebar,
    resourcePaneCollapsed,
    toggleResourcePane,
    theme,
    setTheme,
    setSearchModalOpen,
  } = useUiStore();

  const { openTab } = useTabsStore();

  const handleCreateNote = () => {
    const newNoteId = generateId("not");
    openTab({
      id: `tab_${newNoteId}`,
      documentId: newNoteId,
      documentType: "general",
      title: "Untitled Note",
    });
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <IconButton
          label={sidebarCollapsed ? "Expand sidebar (Ctrl+\\)" : "Collapse sidebar (Ctrl+\\)"}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 2.5zm5 12h7.5a.5.5 0 0 0 .5-.5V2.5a.5.5 0 0 0-.5-.5H6v12.5z" />
            </svg>
          }
          onClick={toggleSidebar}
        />
        <span className="brand-title">CHRONOTE</span>
        <span className="brand-badge">DSM</span>
      </div>

      <button
        type="button"
        className="header-search-trigger"
        onClick={() => setSearchModalOpen(true)}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
        </svg>
        <span>Search workspace (Ctrl+F)...</span>
        <kbd className="search-shortcut">Ctrl+F</kbd>
      </button>

      <div className="header-actions">
        <button
          type="button"
          className="btn-primary-action"
          onClick={handleCreateNote}
          title="Create New Note (Ctrl+N)"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z" />
          </svg>
          <span>New Note</span>
        </button>

        <IconButton
          label={`Toggle ${theme === "dark" ? "Light" : "Dark"} Mode`}
          icon={
            theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0zm0 13a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z" />
              </svg>
            )
          }
          onClick={toggleTheme}
        />

        <IconButton
          label={resourcePaneCollapsed ? "Expand Resource Inspector" : "Collapse Resource Inspector"}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 2.5zm9 12V2H2.5a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5H10z" />
            </svg>
          }
          active={!resourcePaneCollapsed}
          onClick={toggleResourcePane}
        />
      </div>
    </header>
  );
};
