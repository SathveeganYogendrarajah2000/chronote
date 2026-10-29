import React, { useMemo, useState } from "react";
import { useUiStore } from "@application/stores/useUiStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { useDsmStore } from "@application/stores/useDsmStore";
import { useNotesStore } from "@application/stores/useNotesStore";
import { useCoursesStore } from "@application/stores/useCoursesStore";
import { useBinStore } from "@application/stores/useBinStore";
import { formatDateLabel, sortDsmEntries } from "@domain/dsm.utils";
import { filterNotes, filterNotesByTags, groupNotesBySection } from "@domain/note.utils";
import { buildTopicTree } from "@domain/courses.utils";
import { getDaysRemaining, formatDaysRemaining } from "@domain/bin.utils";
import type { TopicTreeNode } from "@domain/courses.types";
import { DSM_TAB_ID, COURSES_TAB_ID, GRAPH_TAB_ID, GRAPH_DOCUMENT_ID, createCoursesTab } from "@domain/tabs.types";
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
  const {
    workspace,
    recentNotes,
    setWorkspaceModalOpen,
    createSection,
    deleteSection,
    togglePinSection,
    setNoteSortBy,
  } = useWorkspaceStore();
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
    moveNoteToSection,
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

  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);

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

  const handleCreateNoteInSection = async (sectionName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await createNote({ section: sectionName });
    } catch (err) {
      console.error("Failed to create note in section:", err);
    }
  };

  const toggleSectionCollapsed = (sectionName: string) => {
    setCollapsedSections((prev) =>
      prev.includes(sectionName)
        ? prev.filter((s) => s !== sectionName)
        : [...prev, sectionName]
    );
  };

  const handleCreateSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSectionName.trim();
    if (!trimmed) {
      setIsCreatingSection(false);
      return;
    }
    await createSection(trimmed);
    setNewSectionName("");
    setIsCreatingSection(false);
  };

  const handleFolderDragOver = (sectionName: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverSection !== sectionName) {
      setDragOverSection(sectionName);
    }
  };

  const handleFolderDragLeave = (sectionName: string, _e: React.DragEvent) => {
    if (dragOverSection === sectionName) {
      setDragOverSection(null);
    }
  };

  const handleFolderDrop = async (sectionName: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSection(null);
    const data = e.dataTransfer.getData("application/x-chronote-note");
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      if (parsed.id && !parsed.id.startsWith("dsm:")) {
        await moveNoteToSection(parsed.id, sectionName);
      }
    } catch (err) {
      console.error("Failed to move dropped note:", err);
    }
  };

  const handleTagClick = (tag: string) => {
    if (isDsmActive) {
      toggleDsmTag(tag);
    } else {
      toggleTagFilter(tag);
    }
  };

  // Filter notes by query and tags
  const filteredNotes = useMemo(() => {
    const base = filterNotes(recentNotes, filterQuery);
    return filterNotesByTags(base, selectedTags, tagMatchMode);
  }, [recentNotes, filterQuery, selectedTags, tagMatchMode]);
  const pinnedNotes = useMemo(() => {
    return filteredNotes.filter((n) => n.pinned);
  }, [filteredNotes]);


  // Group notes into sections
  const noteSortBy = workspace?.settings?.noteSortBy ?? "title";
  const pinnedSections = workspace?.settings?.pinnedSections ?? [];
  const customSections = workspace?.settings?.customSections ?? [];

  const noteSectionGroups = useMemo(() => {
    return groupNotesBySection(filteredNotes, pinnedSections, customSections, noteSortBy);
  }, [filteredNotes, pinnedSections, customSections, noteSortBy]);

  const displaySectionGroups = useMemo(() => {
    const hasFilter = filterQuery.trim().length > 0 || selectedTags.length > 0;
    if (hasFilter) {
      return noteSectionGroups.filter((g) => g.notes.length > 0);
    }
    return noteSectionGroups;
  }, [noteSectionGroups, filterQuery, selectedTags]);

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

  const handleOpenGraph = () => {
    const hasTab = useTabsStore.getState().tabs.find((t) => t.id === GRAPH_TAB_ID);
    if (hasTab) {
      switchTab(GRAPH_TAB_ID);
    } else {
      openTab({
        id: GRAPH_TAB_ID,
        documentId: GRAPH_DOCUMENT_ID,
        documentType: "graph",
        title: "Backlinks Graph",
      });
    }
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

      {/* Knowledge Graph Section (Phase 3) */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>Knowledge Graph</span>
          <span style={{ fontSize: "10px", color: "var(--accent-primary)", fontWeight: 600 }}>v0.2.2</span>
        </div>
        <button
          type="button"
          className={`sidebar-nav-item ${activeTabId === GRAPH_TAB_ID ? "active" : ""}`}
          onClick={handleOpenGraph}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488 1.05l-6.718-3.12a2.5 2.5 0 1 1 0-3.604l6.718-3.12A2.485 2.485 0 0 1 11 2.5z" />
          </svg>
          <span>Backlinks Graph</span>
          <span className="nav-item-count">Explorer</span>
        </button>
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

      {/* General Notes Section (Grouped by Folder / Section) */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>Notes & Folders</span>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: "11px", marginRight: 2 }}>{recentNotes.length}</span>
            <button
              type="button"
              className="note-action-btn"
              style={{ width: 22, height: 20, fontSize: 10, padding: 0 }}
              title={`Sort notes: ${noteSortBy === "title" ? "Title (A-Z)" : "Last Modified"}\nClick to toggle`}
              onClick={() => void setNoteSortBy(noteSortBy === "title" ? "updatedAt" : "title")}
            >
              {noteSortBy === "title" ? "A-Z" : "🕒"}
            </button>
            <button
              type="button"
              className="note-action-btn"
              style={{ width: 22, height: 20, fontSize: 11, padding: 0 }}
              title="Create New Folder / Section"
              onClick={(e) => {
                e.stopPropagation();
                setIsCreatingSection(true);
              }}
            >
              📁+
            </button>
            <button
              type="button"
              className="note-action-btn"
              style={{ width: 20, height: 20, fontSize: 13, padding: 0 }}
              title="Create New Note (Ctrl+N)"
              onClick={handleCreateNote}
            >
              +
            </button>
          </div>
        </div>

        {/* Inline Section / Folder Creator */}
        {isCreatingSection && (
          <form
            onSubmit={handleCreateSectionSubmit}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              margin: "2px 0 6px",
              background: "var(--bg-surface)",
              border: "1px solid var(--accent-primary)",
              borderRadius: "4px",
            }}
          >
            <input
              type="text"
              autoFocus
              placeholder="Folder name..."
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsCreatingSection(false);
                  setNewSectionName("");
                }
              }}
              style={{
                flex: 1,
                fontSize: "11px",
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                background: "var(--accent-primary)",
                color: "#fff",
                border: "none",
                borderRadius: "3px",
                padding: "2px 6px",
                fontSize: "10px",
                cursor: "pointer",
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingSection(false);
                setNewSectionName("");
              }}
              style={{
                background: "transparent",
                color: "var(--text-muted)",
                border: "none",
                fontSize: "12px",
                cursor: "pointer",
                padding: "0 2px",
              }}
            >
              ✕
            </button>
          </form>
        )}

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
          {/* Pinned Notes Quick Access Section */}
          {pinnedNotes.length > 0 && !filterQuery && selectedTags.length === 0 && (
            <div style={{ marginBottom: "6px", paddingBottom: "6px", borderBottom: "1px dashed var(--border-subtle)" }}>
              <div className="sidebar-sub-label" style={{ display: "flex", alignItems: "center", gap: 4, paddingBottom: "2px" }}>
                <span>📌 PINNED</span>
                <span style={{ fontSize: "10px", color: "var(--accent-primary)" }}>({pinnedNotes.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {pinnedNotes.map((note) => {
                  const isTabActive = activeTabId === `tab_${note.id}`;
                  return (
                    <div
                      key={`pinned_${note.id}`}
                      role="button"
                      tabIndex={0}
                      className={`sidebar-note-item ${isTabActive ? "active" : ""}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "application/x-chronote-note",
                          JSON.stringify({ id: note.id, title: note.title })
                        );
                        e.dataTransfer.setData("text/plain", `[[${note.title}]]`);
                        e.dataTransfer.effectAllowed = "copyMove";
                      }}
                      onClick={() => handleOpenGeneralNote(note.id, note.title, note.pinned)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleOpenGeneralNote(note.id, note.title, note.pinned);
                        }
                      }}
                      title={`${note.title} [Folder: ${note.section || "General"}]`}
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, opacity: 0.8 }}>
                        <path d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H4z" />
                      </svg>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {note.title}
                      </span>
                      <span
                        style={{
                          fontSize: "9px",
                          padding: "1px 4px",
                          borderRadius: "3px",
                          background: "var(--bg-surface)",
                          color: "var(--text-muted)",
                          border: "1px solid var(--border-subtle)",
                          marginRight: 4,
                          flexShrink: 0,
                        }}
                        title={`Folder: ${note.section || "General"}`}
                      >
                        📁 {note.section || "General"}
                      </span>
                      <div
                        className="sidebar-note-actions"
                        draggable={false}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="sidebar-note-action-btn active"
                          style={{ width: 18, height: 18, fontSize: 11, color: "var(--accent-primary)" }}
                          title="Unpin note"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            void togglePin(note.id);
                          }}
                        >
                          📌
                        </button>
                        <button
                          type="button"
                          className="sidebar-note-action-btn danger"
                          style={{ width: 18, height: 18, fontSize: 11 }}
                          title="Delete note"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteCandidateId(note.id);
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {recentNotes.length === 0 && displaySectionGroups.length === 0 ? (
            <div style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              {workspace ? "No notes created yet." : "Open a workspace to view notes."}
            </div>
          ) : displaySectionGroups.length === 0 ? (
            <div style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              No matching notes found.
            </div>
          ) : (
            displaySectionGroups.map((group) => {
              const isExpanded = !collapsedSections.includes(group.name);
              const isDragOver = dragOverSection === group.name;

              return (
                <div key={group.name} className="sidebar-section-folder">
                  <div
                    className={`sidebar-section-folder-row ${isDragOver ? "drag-over" : ""}`}
                    onClick={() => toggleSectionCollapsed(group.name)}
                    onDragOver={(e) => handleFolderDragOver(group.name, e)}
                    onDragLeave={(e) => handleFolderDragLeave(group.name, e)}
                    onDrop={(e) => void handleFolderDrop(group.name, e)}
                    title={`Folder: ${group.name} (${group.notes.length} notes)\nClick to toggle. Drag notes here to move.`}
                  >
                    <span
                      className={`sidebar-topic-chevron ${isExpanded ? "expanded" : ""}`}
                      style={{ fontSize: "10px", width: "12px", textAlign: "center", userSelect: "none" }}
                    >
                      ▶
                    </span>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.85, flexShrink: 0 }}>
                      <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
                    </svg>
                    <span style={{ fontWeight: 600, fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {group.name}
                    </span>
                    {group.isPinned && (
                      <span style={{ fontSize: "10px", color: "var(--accent-primary)" }} title="Pinned folder">
                        📌
                      </span>
                    )}
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: 2, marginRight: 2 }}>
                      {group.notes.length}
                    </span>

                    <div className="sidebar-folder-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`sidebar-note-action-btn ${group.isPinned ? "active" : ""}`}
                        style={{
                          width: 18,
                          height: 18,
                          fontSize: 11,
                          color: group.isPinned ? "var(--accent-primary)" : "inherit",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                        title={group.isPinned ? "Unpin folder" : "Pin folder to top"}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => void togglePinSection(group.name)}
                      >
                        {group.isPinned ? "📌" : "📍"}
                      </button>
                      <button
                        type="button"
                        className="sidebar-note-action-btn"
                        style={{
                          width: 18,
                          height: 18,
                          fontSize: 12,
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                        title={`Add note in "${group.name}"`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => void handleCreateNoteInSection(group.name, e)}
                      >
                        +
                      </button>
                      {group.name !== "General" && (
                        <button
                          type="button"
                          className="sidebar-note-action-btn danger"
                          style={{
                            width: 18,
                            height: 18,
                            fontSize: 11,
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                          }}
                          title={`Delete folder "${group.name}" (contained notes will move to General)`}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => void deleteSection(group.name)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="sidebar-section-notes-list" style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: "12px" }}>
                      {group.notes.length === 0 ? (
                        <div style={{ padding: "3px 12px", fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                          (Empty folder)
                        </div>
                      ) : (
                        group.notes.map((note) => {
                          const isTabActive = activeTabId === `tab_${note.id}`;
                          return (
                            <div
                              key={note.id}
                              role="button"
                              tabIndex={0}
                              className={`sidebar-note-item ${isTabActive ? "active" : ""}`}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData(
                                  "application/x-chronote-note",
                                  JSON.stringify({ id: note.id, title: note.title })
                                );
                                e.dataTransfer.setData("text/plain", `[[${note.title}]]`);
                                e.dataTransfer.effectAllowed = "copyMove";
                              }}
                              onClick={() => handleOpenGeneralNote(note.id, note.title, note.pinned)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  handleOpenGeneralNote(note.id, note.title, note.pinned);
                                }
                              }}
                              title={`${note.title} (Drag into editor or another folder)`}
                            >
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, opacity: 0.8 }}>
                                <path d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H4z" />
                              </svg>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                {note.title}
                              </span>

                              {note.pinned && (
                                <span
                                  style={{ fontSize: "10px", color: "var(--accent-primary)", flexShrink: 0, marginRight: 2 }}
                                  title="Pinned note"
                                >
                                  📌
                                </span>
                              )}

                              <div
                                className="sidebar-note-actions"
                                draggable={false}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className={`sidebar-note-action-btn ${note.pinned ? "active" : ""}`}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    fontSize: 11,
                                    color: note.pinned ? "var(--accent-primary)" : "inherit",
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                  }}
                                  title={note.pinned ? "Unpin note" : "Pin note to top"}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void togglePin(note.id);
                                  }}
                                >
                                  {note.pinned ? "📌" : "📍"}
                                </button>
                                <button
                                  type="button"
                                  className="sidebar-note-action-btn danger"
                                  style={{
                                    width: 18,
                                    height: 18,
                                    fontSize: 11,
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                  }}
                                  title="Delete note"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteCandidateId(note.id);
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
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
