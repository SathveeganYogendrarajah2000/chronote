import React, { useMemo, useState } from "react";
import { useUiStore } from "@application/stores/useUiStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { useDsmStore } from "@application/stores/useDsmStore";
import { useNotesStore } from "@application/stores/useNotesStore";
import { useCoursesStore } from "@application/stores/useCoursesStore";
import { useBinStore } from "@application/stores/useBinStore";
import { formatDateLabel, sortDsmEntries } from "@domain/dsm.utils";
import { filterNotes, filterNotesByTags } from "@domain/note.utils";
import { buildTopicTree } from "@domain/courses.utils";
import { getDaysRemaining, formatDaysRemaining } from "@domain/bin.utils";
import type { TopicTreeNode } from "@domain/courses.types";
import { DSM_TAB_ID, COURSES_TAB_ID, createCoursesTab } from "@domain/tabs.types";
import { TagChip } from "../common/TagChip";

interface TopicTreeItemProps {
  node: TopicTreeNode;
  depth: number;
  activeTopicId: string | null;
  isCoursesTabActive: boolean;
  expandedIds: string[];
  onSelectTopic: (id: string) => void;
  onToggleExpand: (id: string, e: React.MouseEvent) => void;
  onAddSubtopic: (id: string, e: React.MouseEvent) => void;
}

const TopicTreeItem: React.FC<TopicTreeItemProps> = ({
  node,
  depth,
  activeTopicId,
  isCoursesTabActive,
  expandedIds,
  onSelectTopic,
  onToggleExpand,
  onAddSubtopic,
}) => {
  const isExpanded = expandedIds.includes(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = isCoursesTabActive && activeTopicId === node.id;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <button
        type="button"
        className={`sidebar-topic-row ${isSelected ? "active" : ""}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => onSelectTopic(node.id)}
        title={`${node.title} (${node.directResourceCount} courses)`}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0, flex: 1 }}>
          {hasChildren ? (
            <span
              className={`sidebar-topic-chevron ${isExpanded ? "expanded" : ""}`}
              onClick={(e) => onToggleExpand(node.id, e)}
            >
              ▶
            </span>
          ) : (
            <span style={{ width: 14, height: 14, display: "inline-block", flexShrink: 0 }} />
          )}
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.8, flexShrink: 0 }}>
            <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
          </svg>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {node.title}
          </span>
        </span>

        <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {node.directResourceCount > 0 && (
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
              {node.directResourceCount}
            </span>
          )}
          <span
            className="sidebar-note-action-btn"
            style={{ width: 16, height: 16, fontSize: 11 }}
            title={`Add subtopic under "${node.title}"`}
            onClick={(e) => onAddSubtopic(node.id, e)}
          >
            +
          </span>
        </span>
      </button>

      {hasChildren && isExpanded && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {node.children.map((child) => (
            <TopicTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeTopicId={activeTopicId}
              isCoursesTabActive={isCoursesTabActive}
              expandedIds={expandedIds}
              onSelectTopic={onSelectTopic}
              onToggleExpand={onToggleExpand}
              onAddSubtopic={onAddSubtopic}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const NavigationSidebar: React.FC = () => {
  const {
    sidebarCollapsed,
    sidebarWidth,
    setSidebarWidth,
    resetSidebarWidth,
    setIsResizingSidebar,
  } = useUiStore();
  const [isResizing, setIsResizing] = useState(false);
  const { activeTabId, switchTab, openTab } = useTabsStore();
  const { workspace, recentNotes, setWorkspaceModalOpen } = useWorkspaceStore();
  const {
    dsmDoc,
    jumpToDate,
    selectedTags: dsmSelectedTags,
    toggleTagFilter: toggleDsmTag,
    clearTagFilters: clearDsmTags,
    tagMatchMode: dsmTagMatchMode,
    setTagMatchMode: setDsmTagMatchMode,
  } = useDsmStore();
  const {
    filterQuery,
    setFilterQuery,
    selectedTags,
    toggleTagFilter,
    clearTagFilters,
    tagMatchMode,
    setTagMatchMode,
    createNote,
    loadNote,
    togglePin,
    setDeleteCandidateId,
  } = useNotesStore();
  const {
    coursesDoc,
    selectedTopicId,
    expandedTopicIds,
    selectTopic,
    toggleTopicExpanded,
    openCreateTopicModal,
  } = useCoursesStore();
  const {
    binnedNotes,
    openBinModal,
    restoreNote,
    deletePermanently,
  } = useBinStore();

  const isDsmActive = activeTabId === DSM_TAB_ID;
  const isCoursesActive = activeTabId === COURSES_TAB_ID;

  const handleOpenDsm = () => {
    switchTab(DSM_TAB_ID);
  };

  const handleOpenCoursesHub = () => {
    openTab(createCoursesTab());
    switchTab(COURSES_TAB_ID);
    selectTopic(null);
  };

  const handleSelectTopicFromSidebar = (topicId: string) => {
    openTab(createCoursesTab());
    switchTab(COURSES_TAB_ID);
    selectTopic(topicId);
  };

  const topicTree = useMemo(() => {
    if (!coursesDoc) return [];
    return buildTopicTree(coursesDoc.topics, coursesDoc.resources, null);
  }, [coursesDoc]);

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

  const handleTagClick = (tag: string) => {
    if (isDsmActive) {
      toggleDsmTag(tag);
    } else {
      toggleTagFilter(tag);
    }
  };

  // Filter and group general notes into pinned and non-pinned
  const filteredNotes = useMemo(() => {
    const base = filterNotes(recentNotes, filterQuery);
    return filterNotesByTags(base, selectedTags, tagMatchMode);
  }, [recentNotes, filterQuery, selectedTags, tagMatchMode]);

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

    // Aggregate tags from Courses Topics & Resources
    if (coursesDoc?.topics) {
      for (const topic of coursesDoc.topics) {
        for (const tag of topic.tags) {
          map.set(tag, (map.get(tag) ?? 0) + 1);
        }
      }
    }
    if (coursesDoc?.resources) {
      for (const res of coursesDoc.resources) {
        for (const tag of res.tags) {
          map.set(tag, (map.get(tag) ?? 0) + 1);
        }
      }
    }

    return Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [recentNotes, dsmDoc, coursesDoc]);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setIsResizingSidebar(true);
    document.body.classList.add("is-resizing-sidebar");

    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const zoom = useUiStore.getState().zoomLevel;
      const delta = (moveEvent.clientX - startX) / zoom;
      setSidebarWidth(startWidth + delta);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setIsResizingSidebar(false);
      document.body.classList.remove("is-resizing-sidebar");
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <aside
      className={`navigation-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${isResizing ? "resizing" : ""}`}
      style={{
        width: sidebarCollapsed ? 0 : sidebarWidth,
        minWidth: sidebarCollapsed ? 0 : sidebarWidth,
      }}
    >
      <div className="sidebar-scrollable-content">
        {/* Workspace Indicator banner */}
        <div className="sidebar-workspace-banner">
        {workspace ? (
          <button
            type="button"
            className="sidebar-workspace-card"
            onClick={() => setWorkspaceModalOpen(true)}
            title={`Active Workspace: ${workspace.name}\nPath: ${workspace.path}\nClick to switch workspace`}
          >
            <div className="sidebar-workspace-card-icon">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9zM2.5 3a.5.5 0 0 0-.5.5V4h5.236a2.03 2.03 0 0 1-.318-.426C6.541 3.14 5.922 3 5.264 3H2.5z" />
              </svg>
            </div>
            <div className="sidebar-workspace-card-text">
              <span className="sidebar-workspace-card-name">{workspace.name}</span>
              <span className="sidebar-workspace-card-path">{workspace.path}</span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            style={{ width: "100%", fontSize: "var(--font-size-xs)", padding: "var(--space-2)" }}
            onClick={() => setWorkspaceModalOpen(true)}
          >
            Open Workspace
          </button>
        )}
      </div>

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

        {/* Active DSM Tag Filter Indicator */}
        {dsmSelectedTags.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "4px 8px",
              margin: "4px 4px 6px",
              background: "rgba(59, 130, 246, 0.12)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "4px",
              fontSize: "11px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>DSM Tags ({dsmSelectedTags.length}):</span>
                {dsmSelectedTags.length > 1 && (
                  <div className="tag-match-toggle" title="Toggle between matching ALL selected tags or ANY selected tag">
                    <button
                      type="button"
                      className={`tag-match-toggle-btn ${dsmTagMatchMode === "and" ? "active" : ""}`}
                      onClick={() => setDsmTagMatchMode("and")}
                    >
                      ALL
                    </button>
                    <button
                      type="button"
                      className={`tag-match-toggle-btn ${dsmTagMatchMode === "or" ? "active" : ""}`}
                      onClick={() => setDsmTagMatchMode("or")}
                    >
                      ANY
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={clearDsmTags}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: "11px",
                  lineHeight: 1,
                  padding: "0 2px",
                }}
                title="Clear DSM tag filters"
              >
                Clear all ×
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {dsmSelectedTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    background: "rgba(59, 130, 246, 0.2)",
                    color: "#60a5fa",
                    borderRadius: "3px",
                    padding: "1px 5px",
                    fontSize: "10px",
                    fontWeight: 600,
                  }}
                >
                  #{tag}
                  <span
                    style={{ cursor: "pointer", opacity: 0.75, fontSize: "11px" }}
                    onClick={() => toggleDsmTag(tag)}
                    title={`Remove #${tag} filter`}
                  >
                    ×
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

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
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "application/x-chronote-note",
                      JSON.stringify({
                        id: `dsm:${entry.date}`,
                        title: `DSM Stand-up (${entry.date})`,
                      })
                    );
                    e.dataTransfer.setData("text/plain", `[[DSM Stand-up (${entry.date})]]`);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => handleJumpToDsmDate(entry.date)}
                  title={`Jump to ${entry.date} (Drag to drop link into editor)`}
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

      {/* Courses & Learning Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>Courses & Topics</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "11px" }}>{coursesDoc?.topics.length ?? 0}</span>
            <button
              type="button"
              className="note-action-btn"
              style={{ width: 18, height: 18, fontSize: 13, padding: 0 }}
              title="Create New Root Topic"
              onClick={(e) => {
                e.stopPropagation();
                openCreateTopicModal(null);
              }}
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          className={`sidebar-nav-item ${isCoursesActive && !selectedTopicId ? "active" : ""}`}
          onClick={handleOpenCoursesHub}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8.211 2.047a.5.5 0 0 0-.422 0l-7.5 3.5a.5.5 0 0 0 .025.917l7.5 3a.5.5 0 0 0 .372 0L14 7.14V13a1 1 0 0 0-1 1v2h3v-2a1 1 0 0 0-1-1V6.739l.686-.275a.5.5 0 0 0 .025-.917l-7.5-3.5Z" />
            <path d="M4.179 9.255 1.5 10.5V12a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-1.5l-2.679-1.245L8 11.245 4.179 9.255Z" />
          </svg>
          <span>Courses Hub</span>
          <span className="nav-item-count">{coursesDoc?.resources.length ?? 0} courses</span>
        </button>

        {/* Topic Tree */}
        {topicTree.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 4 }}>
            {topicTree.map((node) => (
              <TopicTreeItem
                key={node.id}
                node={node}
                depth={0}
                activeTopicId={selectedTopicId}
                isCoursesTabActive={isCoursesActive}
                expandedIds={expandedTopicIds}
                onSelectTopic={handleSelectTopicFromSidebar}
                onToggleExpand={(id, e) => {
                  e.stopPropagation();
                  toggleTopicExpanded(id);
                }}
                onAddSubtopic={(id, e) => {
                  e.stopPropagation();
                  openCreateTopicModal(id);
                }}
              />
            ))}
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

        {/* Active Tag Filter Indicator */}
        {selectedTags.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "4px 8px",
              margin: "2px 8px 6px",
              background: "rgba(99, 102, 241, 0.12)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              borderRadius: "4px",
              fontSize: "11px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>Tags ({selectedTags.length}):</span>
                {selectedTags.length > 1 && (
                  <div className="tag-match-toggle" title="Toggle between matching ALL selected tags or ANY selected tag">
                    <button
                      type="button"
                      className={`tag-match-toggle-btn ${tagMatchMode === "and" ? "active" : ""}`}
                      onClick={() => setTagMatchMode("and")}
                    >
                      ALL
                    </button>
                    <button
                      type="button"
                      className={`tag-match-toggle-btn ${tagMatchMode === "or" ? "active" : ""}`}
                      onClick={() => setTagMatchMode("or")}
                    >
                      ANY
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={clearTagFilters}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: "11px",
                  lineHeight: 1,
                  padding: "0 2px",
                }}
                title="Clear all tag filters"
              >
                Clear all ×
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    background: "rgba(99, 102, 241, 0.2)",
                    color: "var(--accent-primary, #6366f1)",
                    borderRadius: "3px",
                    padding: "1px 5px",
                    fontSize: "10px",
                    fontWeight: 600,
                  }}
                >
                  #{tag}
                  <span
                    style={{ cursor: "pointer", opacity: 0.75, fontSize: "11px" }}
                    onClick={() => toggleTagFilter(tag)}
                    title={`Remove #${tag} filter`}
                  >
                    ×
                  </span>
                </span>
              ))}
            </div>
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
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            "application/x-chronote-note",
                            JSON.stringify({ id: note.id, title: note.title })
                          );
                          e.dataTransfer.setData("text/plain", `[[${note.title}]]`);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => handleOpenGeneralNote(note.id, note.title, note.pinned)}
                        title={`${note.title} (Drag into editor to link)`}
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
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            "application/x-chronote-note",
                            JSON.stringify({ id: note.id, title: note.title })
                          );
                          e.dataTransfer.setData("text/plain", `[[${note.title}]]`);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => handleOpenGeneralNote(note.id, note.title, note.pinned)}
                        title={`${note.title} (Drag into editor to link)`}
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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {((isDsmActive && dsmSelectedTags.length > 0) || (!isDsmActive && selectedTags.length > 0)) && (
              <button
                type="button"
                onClick={isDsmActive ? clearDsmTags : clearTagFilters}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--accent-hover)",
                  fontSize: "10px",
                  padding: 0,
                }}
                title="Clear active tag filters"
              >
                Clear ({isDsmActive ? dsmSelectedTags.length : selectedTags.length})
              </button>
            )}
            <span style={{ fontSize: "11px" }}>{dynamicTags.length}</span>
          </div>
        </div>
        {dynamicTags.length === 0 ? (
          <div style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
            No tags found.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 4px" }}>
            {dynamicTags.map((item) => {
              const isSelected = isDsmActive
                ? dsmSelectedTags.includes(item.tag)
                : selectedTags.includes(item.tag);
              return (
                <span
                  key={item.tag}
                  style={{
                    borderRadius: "4px",
                    boxShadow: isSelected ? "0 0 0 1.5px var(--accent-primary, #6366f1)" : "none",
                    display: "inline-flex",
                  }}
                >
                  <TagChip
                    tag={item.tag}
                    count={item.count}
                    onClick={handleTagClick}
                  />
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Recycle Bin Section */}
      <div className="sidebar-section" style={{ borderBottom: "none", borderTop: "1px solid var(--border-subtle)", marginTop: "auto" }}>
        <div className="sidebar-section-header">
          <div
            style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", width: "100%" }}
            onClick={openBinModal}
            title="Open Recycle Bin (keeps deleted notes for 30 days)"
          >
            <span>🗑️ Bin</span>
            {binnedNotes.length > 0 && (
              <span className="bin-days-pill normal" style={{ padding: "0 5px", fontSize: "9px" }}>
                {binnedNotes.length}
              </span>
            )}
          </div>
          {binnedNotes.length > 0 && (
            <button
              type="button"
              onClick={openBinModal}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--accent-hover)",
                fontSize: "10px",
                padding: 0,
              }}
              title="Manage Recycle Bin"
            >
              Open
            </button>
          )}
        </div>
        {binnedNotes.length === 0 ? (
          <div style={{ padding: "4px var(--space-3)", fontSize: "11px", color: "var(--text-muted)" }}>
            Bin is empty
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {binnedNotes.slice(0, 5).map((item) => {
              const days = getDaysRemaining(item.expiresAt);
              return (
                <div
                  key={item.id}
                  className="sidebar-bin-item"
                  onClick={openBinModal}
                  title={`${item.title} (${formatDaysRemaining(days)})\nClick to view in Bin`}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {item.title || "Untitled Note"}
                  </span>
                  <span style={{ fontSize: "10px", opacity: 0.7, marginRight: 6 }}>
                    {days}d
                  </span>
                  <div className="sidebar-note-actions">
                    <span
                      className="sidebar-note-action-btn"
                      title="Restore note"
                      onClick={(e) => {
                        e.stopPropagation();
                        void restoreNote(item.id);
                      }}
                    >
                      ↺
                    </span>
                    <span
                      className="sidebar-note-action-btn danger"
                      title="Delete permanently"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deletePermanently(item.id);
                      }}
                    >
                      ❌
                    </span>
                  </div>
                </div>
              );
            })}
            {binnedNotes.length > 5 && (
              <button
                type="button"
                onClick={openBinModal}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--accent-hover)",
                  fontSize: "11px",
                  padding: "4px 8px 4px 22px",
                  textAlign: "left",
                }}
              >
                + {binnedNotes.length - 5} more in Bin...
              </button>
            )}
          </div>
        )}
      </div>
      </div>
      {!sidebarCollapsed && (
        <div
          className={`sidebar-resize-handle ${isResizing ? "resizing" : ""}`}
          onMouseDown={handleMouseDownResize}
          onDoubleClick={resetSidebarWidth}
          title="Drag to resize sidebar (Double-click to reset width)"
        />
      )}
    </aside>
  );
};
