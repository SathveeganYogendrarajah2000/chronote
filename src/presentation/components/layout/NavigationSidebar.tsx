import React, { useMemo } from "react";
import { useUiStore } from "@application/stores/useUiStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { DSM_TAB_ID } from "@domain/tabs.types";
import { TagChip } from "../common/TagChip";

export const NavigationSidebar: React.FC = () => {
  const { sidebarCollapsed } = useUiStore();
  const { activeTabId, switchTab, openTab } = useTabsStore();
  const { workspace, recentNotes, setWorkspaceModalOpen } = useWorkspaceStore();

  const isDsmActive = activeTabId === DSM_TAB_ID;

  const handleOpenDsm = () => {
    switchTab(DSM_TAB_ID);
  };

  const handleOpenGeneralNote = (id: string, title: string) => {
    openTab({
      id: `tab_${id}`,
      documentId: id,
      documentType: "general",
      title,
    });
  };

  const dynamicTags = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of recentNotes) {
      for (const tag of note.tags) {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [recentNotes]);

  return (
    <aside className={`navigation-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
      {/* Workspace Indicator banner if no workspace is active */}
      {!workspace && (
        <div style={{ padding: "var(--space-3)", borderBottom: "1px solid var(--border-subtle)" }}>
          <button
            type="button"
            className="btn-primary"
            style={{ width: "100%", fontSize: "var(--font-size-xs)", padding: "var(--space-2)" }}
            onClick={() => setWorkspaceModalOpen(true)}
          >
            Open Workspace
          </button>
        </div>
      )}

      {/* DSM Journal Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>Daily Stand-up</span>
        </div>
        <button
          type="button"
          className={`sidebar-nav-item ${isDsmActive ? "active" : ""}`}
          onClick={handleOpenDsm}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
          </svg>
          <span>DSM Journal</span>
          <span className="nav-item-count">Continuous</span>
        </button>
      </div>

      {/* General Notes Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>General Notes</span>
          <span style={{ fontSize: "11px" }}>{recentNotes.length}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {recentNotes.length === 0 ? (
            <div style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              {workspace ? "No notes created yet." : "Open a workspace to view notes."}
            </div>
          ) : (
            recentNotes.map((note) => {
              const isTabActive = activeTabId === `tab_${note.id}`;
              return (
                <button
                  key={note.id}
                  type="button"
                  className={`sidebar-nav-item ${isTabActive ? "active" : ""}`}
                  onClick={() => handleOpenGeneralNote(note.id, note.title)}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H4z" />
                  </svg>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {note.title}
                  </span>
                  {note.pinned && (
                    <span title="Pinned" style={{ marginLeft: "auto", fontSize: "10px", opacity: 0.8 }}>
                      📌
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Tags Section */}
      <div className="sidebar-section" style={{ borderBottom: "none" }}>
        <div className="sidebar-section-header">
          <span>Tags</span>
          <span style={{ fontSize: "11px" }}>{dynamicTags.length}</span>
        </div>
        {dynamicTags.length === 0 ? (
          <div style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
            No tags found.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {dynamicTags.map((item) => (
              <TagChip key={item.tag} tag={item.tag} count={item.count} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
