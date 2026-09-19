import React, { useMemo } from "react";
import { useUiStore } from "@application/stores/useUiStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { useDsmStore } from "@application/stores/useDsmStore";
import { useNotesStore } from "@application/stores/useNotesStore";
import { formatDateLabel, sortDsmEntries } from "@domain/dsm.utils";
import { filterNotes } from "@domain/note.utils";
import { DSM_TAB_ID } from "@domain/tabs.types";
import { TagChip } from "../common/TagChip";

export const NavigationSidebar: React.FC = () => {
  const { sidebarCollapsed } = useUiStore();
  const { activeTabId, switchTab, openTab } = useTabsStore();
  const { workspace, recentNotes, setWorkspaceModalOpen } = useWorkspaceStore();
  const { dsmDoc, jumpToDate } = useDsmStore();
  const {
    filterQuery,
    setFilterQuery,
    createNote,
    loadNote,
    togglePin,
    setDeleteCandidateId,
  } = useNotesStore();

  const isDsmActive = activeTabId === DSM_TAB_ID;

  const handleOpenDsm = () => {
    switchTab(DSM_TAB_ID);
  };

  const handleJumpToDsmDate = (date: string) => {
    switchTab(DSM_TAB_ID);
    jumpToDate(date);
  };

  const recentDsmEntries = useMemo(() => {
    if (!dsmDoc || !dsmDoc.entries) return [];
    return sortDsmEntries(dsmDoc.entries, "desc").slice(0, 5);
  }, [dsmDoc]);

  const handleOpenGeneralNote = async (id: string, title: string, pinned: boolean) => {
    openTab({
      id: `tab_${id}`,
      documentId: id,
      documentType: "general",
      title,
      isPinned: pinned,
    });
    await loadNote(id);
  };

  const handleCreateNote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await createNote();
    } catch (err) {
      console.error("Failed to create note:", err);
    }
  };

  // Filter and group general notes into pinned and non-pinned
  const filteredNotes = useMemo(() => {
    return filterNotes(recentNotes, filterQuery);
  }, [recentNotes, filterQuery]);

  const pinnedNotes = useMemo(() => {
    return filteredNotes.filter((n) => n.pinned);
  }, [filteredNotes]);

  const unpinnedNotes = useMemo(() => {
    return filteredNotes.filter((n) => !n.pinned);
  }, [filteredNotes]);

  const dynamicTags = useMemo(() => {
    const map = new Map<string, number>();

    // Aggregate tags from General Notes
    for (const note of recentNotes) {
      for (const tag of note.tags) {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      }
    }

    // Aggregate tags from DSM Entries
    if (dsmDoc?.entries) {
      for (const entry of dsmDoc.entries) {
        for (const tag of entry.tags) {
          map.set(tag, (map.get(tag) ?? 0) + 1);
        }
      }
    }

    return Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [recentNotes, dsmDoc]);

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
          <span style={{ fontSize: "11px" }}>{dsmDoc?.entries.length ?? 0}</span>
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
          <span className="nav-item-count">Timeline</span>
        </button>

        {/* Quick jump to recent dates in DSM */}
        {recentDsmEntries.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 4, paddingLeft: "var(--space-2)" }}>
            {recentDsmEntries.map((entry) => {
              const { dayOfWeek, isToday } = formatDateLabel(entry.date);
              return (
                <button
                  key={entry.id}
                  type="button"
                  className="sidebar-nav-item"
                  style={{ fontSize: "var(--font-size-xs)", padding: "3px 6px" }}
                  onClick={() => handleJumpToDsmDate(entry.date)}
                  title={`Jump to ${entry.date}`}
                >
                  <span style={{ fontFamily: "var(--font-mono)", opacity: 0.9 }}>{entry.date}</span>
                  <span style={{ marginLeft: "auto", fontSize: "10px", color: isToday ? "var(--accent-hover)" : "var(--text-muted)" }}>
                    {isToday ? "Today" : dayOfWeek.slice(0, 3)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* General Notes Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>General Notes</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "11px" }}>{recentNotes.length}</span>
            <button
              type="button"
              className="note-action-btn"
              style={{ width: 18, height: 18, fontSize: 13, padding: 0 }}
              title="Create New Note (Ctrl+N)"
              onClick={handleCreateNote}
            >
              +
            </button>
          </div>
        </div>

        {/* Search / Filter Notes Input */}
        {recentNotes.length > 0 && (
          <div className="sidebar-note-search">
            <input
              type="text"
              className="sidebar-search-input"
              placeholder="Filter notes..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {recentNotes.length === 0 ? (
            <div style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              {workspace ? "No notes created yet." : "Open a workspace to view notes."}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              No matching notes found.
            </div>
          ) : (
            <>
              {/* Pinned Notes Group */}
              {pinnedNotes.length > 0 && (
                <>
                  <div className="sidebar-sub-label">PINNED</div>
                  {pinnedNotes.map((note) => {
                    const isTabActive = activeTabId === `tab_${note.id}`;
                    return (
                      <button
                        key={note.id}
                        type="button"
                        className={`sidebar-note-item ${isTabActive ? "active" : ""}`}
                        onClick={() => handleOpenGeneralNote(note.id, note.title, note.pinned)}
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
                          <path d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H4z" />
                        </svg>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {note.title}
                        </span>
                        <div className="sidebar-note-actions">
                          <span
                            className="sidebar-note-action-btn"
                            title="Unpin note"
                            onClick={(e) => {
                              e.stopPropagation();
                              void togglePin(note.id);
                            }}
                          >
                            📌
                          </span>
                          <span
                            className="sidebar-note-action-btn danger"
                            title="Delete note"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteCandidateId(note.id);
                            }}
                          >
                            🗑️
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {/* Unpinned Notes Group */}
              {unpinnedNotes.length > 0 && (
                <>
                  {pinnedNotes.length > 0 && <div className="sidebar-sub-label" style={{ marginTop: 4 }}>NOTES</div>}
                  {unpinnedNotes.map((note) => {
                    const isTabActive = activeTabId === `tab_${note.id}`;
                    return (
                      <button
                        key={note.id}
                        type="button"
                        className={`sidebar-note-item ${isTabActive ? "active" : ""}`}
                        onClick={() => handleOpenGeneralNote(note.id, note.title, note.pinned)}
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
                          <path d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H4z" />
                        </svg>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {note.title}
                        </span>
                        <div className="sidebar-note-actions">
                          <span
                            className="sidebar-note-action-btn"
                            title="Pin note to top"
                            onClick={(e) => {
                              e.stopPropagation();
                              void togglePin(note.id);
                            }}
                          >
                            📌
                          </span>
                          <span
                            className="sidebar-note-action-btn danger"
                            title="Delete note"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteCandidateId(note.id);
                            }}
                          >
                            🗑️
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </>
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
