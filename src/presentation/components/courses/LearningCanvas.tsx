import React, { useMemo } from "react";
import { useCoursesStore } from "@application/stores/useCoursesStore";
import {
  getTopicPath,
  filterResources,
  calculateTopicProgress,
  calculateOverallCoursesProgress,
  getPlatformLabel,
  getStatusLabel,
} from "@domain/courses.utils";
import type { LearningPlatform, LearningStatus } from "@domain/courses.types";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";
import { TagPicker } from "../common/TagPicker";

const PLATFORMS: { key: LearningPlatform | "all"; label: string }[] = [
  { key: "all", label: "All Platforms" },
  { key: "udemy", label: "Udemy" },
  { key: "youtube", label: "YouTube" },
  { key: "article", label: "Articles" },
  { key: "course", label: "Courses" },
  { key: "book", label: "Books" },
  { key: "documentation", label: "Docs" },
  { key: "other", label: "Other" },
];

const STATUSES: { key: LearningStatus | "all"; label: string }[] = [
  { key: "all", label: "All Status" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "not_started", label: "Not Started" },
  { key: "on_hold", label: "On Hold" },
];

export const LearningCanvas: React.FC = () => {
  const {
    coursesDoc,
    selectedTopicId,
    selectTopic,
    searchQuery,
    setSearchQuery,
    selectedPlatform,
    setSelectedPlatform,
    selectedStatus,
    setSelectedStatus,
    selectedTags,
    tagMatchMode,
    openCreateTopicModal,
    openEditTopicModal,
    deleteTopic,
    openCreateResourceModal,
    openEditResourceModal,
    deleteResource,
    incrementResourceProgress,
    openNoteModal,
    updateTopic,
  } = useCoursesStore();

  const topics = useMemo(() => coursesDoc?.topics ?? [], [coursesDoc]);
  const resources = useMemo(() => coursesDoc?.resources ?? [], [coursesDoc]);

  // Active topic object
  const activeTopic = useMemo(() => {
    if (!selectedTopicId) return null;
    return topics.find((t) => t.id === selectedTopicId) ?? null;
  }, [topics, selectedTopicId]);

  // Breadcrumbs path
  const breadcrumbs = useMemo(() => {
    return getTopicPath(topics, selectedTopicId);
  }, [topics, selectedTopicId]);

  // Child subtopics of currently active topic (or root topics if none selected)
  const childSubtopics = useMemo(() => {
    return topics.filter((t) => t.parentId === selectedTopicId);
  }, [topics, selectedTopicId]);

  // Filtered resources
  const filteredResources = useMemo(() => {
    return filterResources(resources, {
      topicId: selectedTopicId,
      includeSubtopics: false, // In topic view, show direct resources for that topic/subtopic
      allTopics: topics,
      platform: selectedPlatform,
      status: selectedStatus,
      query: searchQuery,
      tags: selectedTags,
      tagMatchMode,
    });
  }, [resources, selectedTopicId, topics, selectedPlatform, selectedStatus, searchQuery, selectedTags, tagMatchMode]);

  // Metrics for active topic
  const activeTopicProgress = useMemo(() => {
    if (!selectedTopicId) return 0;
    return calculateTopicProgress(selectedTopicId, topics, resources);
  }, [selectedTopicId, topics, resources]);

  // Metrics for entire workspace
  const overallProgress = useMemo(() => {
    return calculateOverallCoursesProgress(resources);
  }, [resources]);

  const handleOpenExternal = (url: string) => {
    if (!url) return;
    void ipcBridge.openExternalUrl(url);
  };

  const handleDeleteTopic = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete topic "${title}"? This will also remove any subtopics and courses under it.`)) {
      void deleteTopic(id);
    }
  };

  const handleDeleteResource = (id: string, title: string) => {
    if (window.confirm(`Delete course "${title}"?`)) {
      void deleteResource(id);
    }
  };

  const handleAddTopicTag = (tag: string) => {
    if (activeTopic && !activeTopic.tags.includes(tag)) {
      updateTopic(activeTopic.id, { tags: [...activeTopic.tags, tag] });
    }
  };

  const handleRemoveTopicTag = (tagToRemove: string) => {
    if (activeTopic) {
      updateTopic(activeTopic.id, {
        tags: activeTopic.tags.filter((t) => t !== tagToRemove),
      });
    }
  };

  return (
    <div className="learning-canvas-container">
      {/* Top Navigation & Breadcrumbs */}
      <div className="learning-top-nav">
        <div className="learning-breadcrumb-bar">
          <div className="learning-breadcrumbs">
            <button
              type="button"
              className={`learning-breadcrumb-item ${!selectedTopicId ? "active" : ""}`}
              onClick={() => selectTopic(null)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.707 1.5Z" />
              </svg>
              <span>Courses Hub</span>
            </button>

            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.id}>
                  <span className="learning-breadcrumb-separator">/</span>
                  <button
                    type="button"
                    className={`learning-breadcrumb-item ${isLast ? "active" : ""}`}
                    onClick={() => selectTopic(crumb.id)}
                  >
                    {crumb.title}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="learning-top-actions">
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: "var(--font-size-xs)", padding: "4px 10px" }}
              onClick={() => openCreateTopicModal(selectedTopicId)}
            >
              + {selectedTopicId ? "New Subtopic" : "New Topic"}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: "var(--font-size-xs)", padding: "4px 12px" }}
              onClick={() => openCreateResourceModal(selectedTopicId ?? undefined)}
            >
              + Add Course / Resource
            </button>
          </div>
        </div>

        {/* Search & Platform / Status Filters */}
        <div className="learning-filter-toolbar">
          <div className="learning-search-box">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
            </svg>
            <input
              type="text"
              className="learning-search-input"
              placeholder="Search courses, videos, instructors, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "12px", padding: 0 }}
              >
                ×
              </button>
            )}
          </div>

          <div className="learning-pill-group">
            {PLATFORMS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`learning-pill-btn ${selectedPlatform === p.key ? "active" : ""}`}
                onClick={() => setSelectedPlatform(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="learning-pill-group">
            {STATUSES.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`learning-pill-btn ${selectedStatus === s.key ? "active" : ""}`}
                onClick={() => setSelectedStatus(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* VIEW A: Active Topic View */}
      {activeTopic ? (
        <>
          {/* Topic Detail Header Banner */}
          <div className="topic-detail-card">
            <div className="topic-detail-header-row">
              <div className="topic-detail-title-area">
                <h1 className="topic-detail-title">
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ color: "var(--accent-hover)", flexShrink: 0 }}>
                    <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
                  </svg>
                  {activeTopic.title}
                </h1>
                {activeTopic.description && (
                  <p className="topic-detail-description">{activeTopic.description}</p>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: "11px", padding: "3px 8px" }}
                  onClick={() => openEditTopicModal(activeTopic)}
                  title="Edit topic details"
                >
                  Edit Topic
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: "11px", padding: "3px 8px", color: "#f87171" }}
                  onClick={() => handleDeleteTopic(activeTopic.id, activeTopic.title)}
                  title="Delete topic"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Tags Row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
              {activeTopic.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "rgba(59, 130, 246, 0.15)",
                    color: "#60a5fa",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "11px",
                  }}
                >
                  #{tag}
                  <span
                    style={{ cursor: "pointer", opacity: 0.7 }}
                    onClick={() => handleRemoveTopicTag(tag)}
                  >
                    ×
                  </span>
                </span>
              ))}
              <TagPicker
                currentTags={activeTopic.tags}
                onAddTag={handleAddTopicTag}
                size="small"
                placeholder="+ Add topic tag"
              />
            </div>

            {/* Meta & Progress Row */}
            <div className="topic-detail-meta-row">
              <span className="topic-progress-badge">
                Progress: {activeTopicProgress}%
                <div className="topic-progress-bar-mini">
                  <div
                    className="topic-progress-bar-fill"
                    style={{ width: `${activeTopicProgress}%` }}
                  />
                </div>
              </span>
              <span>•</span>
              <span>{childSubtopics.length} {childSubtopics.length === 1 ? "Subtopic" : "Subtopics"}</span>
              <span>•</span>
              <span>{filteredResources.length} {filteredResources.length === 1 ? "Resource" : "Resources"}</span>
              {activeTopic.notes && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    className="resource-notes-toggle-btn has-notes"
                    onClick={() => openNoteModal({ topic: activeTopic })}
                  >
                    📝 View Topic Synthesis
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Subtopics Section (N-level tree) */}
          <div className="subtopics-section">
            <div className="section-title-row">
              <span className="section-title-label">
                Subtopics ({childSubtopics.length})
              </span>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: "11px", padding: "2px 8px" }}
                onClick={() => openCreateTopicModal(activeTopic.id)}
              >
                + Add Subtopic
              </button>
            </div>

            <div className="subtopics-grid">
              {childSubtopics.map((subtopic) => {
                const subProgress = calculateTopicProgress(subtopic.id, topics, resources);
                const subResourcesCount = resources.filter((r) => r.topicId === subtopic.id).length;
                const nestedChildCount = topics.filter((t) => t.parentId === subtopic.id).length;

                return (
                  <div
                    key={subtopic.id}
                    className="subtopic-card"
                    onClick={() => selectTopic(subtopic.id)}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div className="subtopic-card-title">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ color: "var(--accent-hover)", flexShrink: 0 }}>
                          <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
                        </svg>
                        <span>{subtopic.title}</span>
                      </div>
                      <p className="subtopic-card-desc">
                        {subtopic.description || "No description provided."}
                      </p>
                    </div>

                    <div className="subtopic-card-footer">
                      <span>{subResourcesCount} {subResourcesCount === 1 ? "course" : "courses"}</span>
                      {nestedChildCount > 0 && <span>• {nestedChildCount} sub</span>}
                      <span style={{ fontWeight: 600, color: "var(--accent-hover)" }}>{subProgress}%</span>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                className="add-subtopic-card-btn"
                onClick={() => openCreateTopicModal(activeTopic.id)}
              >
                <span style={{ fontSize: "18px" }}>+</span>
                <span>Add Subtopic</span>
              </button>
            </div>
          </div>

          {/* Resources / Courses Section */}
          <div className="resources-section">
            <div className="section-title-row">
              <span className="section-title-label">
                Followed Courses, Videos & Articles ({filteredResources.length})
              </span>
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: "11px", padding: "2px 8px" }}
                onClick={() => openCreateResourceModal(activeTopic.id)}
              >
                + Add Resource
              </button>
            </div>

            {filteredResources.length === 0 ? (
              <div className="courses-empty-state">
                <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.3 }}>
                  <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" />
                </svg>
                <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-size-sm)", margin: 0 }}>
                  No courses, videos, or articles added for this topic yet.
                </p>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: "var(--font-size-xs)" }}
                  onClick={() => openCreateResourceModal(activeTopic.id)}
                >
                  + Add Course, YouTube Video, or Article
                </button>
              </div>
            ) : (
              <div className="resources-grid">
                {filteredResources.map((res) => (
                  <div key={res.id} className="resource-card">
                    <div className="resource-card-header">
                      <span className={`platform-badge ${res.platform}`}>
                        {getPlatformLabel(res.platform)}
                      </span>

                      <div className="resource-card-actions">
                        {res.url && (
                          <button
                            type="button"
                            className="note-action-btn"
                            style={{ fontSize: "12px", width: "24px", height: "24px" }}
                            title="Open link in browser"
                            onClick={() => handleOpenExternal(res.url)}
                          >
                            ↗
                          </button>
                        )}
                        <button
                          type="button"
                          className="note-action-btn"
                          style={{ fontSize: "12px", width: "24px", height: "24px" }}
                          title="Edit course"
                          onClick={() => openEditResourceModal(res)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="note-action-btn"
                          style={{ fontSize: "12px", width: "24px", height: "24px", color: "#f87171" }}
                          title="Delete course"
                          onClick={() => handleDeleteResource(res.id, res.title)}
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <h4 className="resource-card-title">{res.title}</h4>
                    {res.author && (
                      <span className="resource-card-author">by {res.author}</span>
                    )}

                    {/* Progress Control */}
                    <div className="resource-progress-control">
                      <div className="resource-progress-meta">
                        <span>Progress: {res.progress}%</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {res.totalItems && (
                            <span>
                              {res.completedItems ?? 0} / {res.totalItems} done
                            </span>
                          )}
                          <div className="resource-stepper">
                            <button
                              type="button"
                              className="resource-step-btn"
                              title="Decrement completed lecture"
                              onClick={() => incrementResourceProgress(res.id, -1)}
                            >
                              -
                            </button>
                            <button
                              type="button"
                              className="resource-step-btn"
                              title="Increment completed lecture (+1)"
                              onClick={() => incrementResourceProgress(res.id, 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="resource-progress-bar">
                        <div
                          className={`resource-progress-fill ${res.progress >= 100 ? "completed" : ""}`}
                          style={{ width: `${res.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer with status, rating, and notes button */}
                    <div className="resource-card-footer">
                      <span className={`resource-status-badge ${res.status}`}>
                        {getStatusLabel(res.status)}
                      </span>

                      {res.rating && (
                        <div className="star-rating-display">
                          {"★".repeat(res.rating)}
                        </div>
                      )}

                      <button
                        type="button"
                        className={`resource-notes-toggle-btn ${res.notes ? "has-notes" : ""}`}
                        onClick={() => openNoteModal({ resource: res })}
                        title="Study notes for this course"
                      >
                        📝 {res.notes ? "View Notes" : "+ Add Notes"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* VIEW B: Root Overview (Courses Hub) */
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {/* Metric Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
            <div className="topic-detail-card" style={{ padding: "var(--space-4)", margin: 0 }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Topics</span>
              <span style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)" }}>{topics.length}</span>
            </div>
            <div className="topic-detail-card" style={{ padding: "var(--space-4)", margin: 0 }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Followed Resources</span>
              <span style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)" }}>{resources.length}</span>
            </div>
            <div className="topic-detail-card" style={{ padding: "var(--space-4)", margin: 0 }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>In Progress</span>
              <span style={{ fontSize: "28px", fontWeight: 700, color: "#60a5fa" }}>
                {resources.filter((r) => r.status === "in_progress").length}
              </span>
            </div>
            <div className="topic-detail-card" style={{ padding: "var(--space-4)", margin: 0 }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Completed</span>
              <span style={{ fontSize: "28px", fontWeight: 700, color: "#34d399" }}>
                {resources.filter((r) => r.status === "completed").length}
              </span>
            </div>
            <div className="topic-detail-card" style={{ padding: "var(--space-4)", margin: 0 }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Overall Progress</span>
              <span style={{ fontSize: "28px", fontWeight: 700, color: "var(--accent-hover)" }}>{overallProgress}%</span>
            </div>
          </div>

          {/* Root Topics Section */}
          <div className="subtopics-section">
            <div className="section-title-row">
              <span className="section-title-label">
                Topics ({childSubtopics.length})
              </span>
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: "11px", padding: "4px 10px" }}
                onClick={() => openCreateTopicModal(null)}
              >
                + Create Root Topic
              </button>
            </div>

            {childSubtopics.length === 0 ? (
              <div className="courses-empty-state">
                <svg width="36" height="36" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.3 }}>
                  <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
                </svg>
                <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-size-base)", margin: 0 }}>
                  No learning topics created yet.
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)", margin: 0, maxWidth: 400 }}>
                  Organize your study goals by creating topics (e.g. Distributed Systems, Rust, Machine Learning) and subtopics, then attach Udemy courses, YouTube videos, articles, and books.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => openCreateTopicModal(null)}
                >
                  Create Your First Topic
                </button>
              </div>
            ) : (
              <div className="subtopics-grid">
                {childSubtopics.map((topic) => {
                  const subtopicCount = topics.filter((t) => t.parentId === topic.id).length;
                  const topicProgress = calculateTopicProgress(topic.id, topics, resources);
                  const directCount = resources.filter((r) => r.topicId === topic.id).length;

                  return (
                    <div
                      key={topic.id}
                      className="subtopic-card"
                      onClick={() => selectTopic(topic.id)}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div className="subtopic-card-title">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ color: "var(--accent-hover)", flexShrink: 0 }}>
                            <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
                          </svg>
                          <span>{topic.title}</span>
                        </div>
                        <p className="subtopic-card-desc">
                          {topic.description || "Click to view subtopics, courses, and resources."}
                        </p>
                      </div>

                      <div className="subtopic-card-footer">
                        <span>{subtopicCount} subtopics • {directCount} courses</span>
                        <span style={{ fontWeight: 600, color: "var(--accent-hover)" }}>{topicProgress}%</span>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  className="add-subtopic-card-btn"
                  onClick={() => openCreateTopicModal(null)}
                >
                  <span style={{ fontSize: "20px" }}>+</span>
                  <span>Create Topic</span>
                </button>
              </div>
            )}
          </div>

          {/* All Resources Stream */}
          {resources.length > 0 && (
            <div className="resources-section">
              <div className="section-title-row">
                <span className="section-title-label">
                  All Learning Resources ({filteredResources.length})
                </span>
              </div>

              <div className="resources-grid">
                {filteredResources.map((res) => {
                  const parentTopic = topics.find((t) => t.id === res.topicId);
                  return (
                    <div key={res.id} className="resource-card">
                      <div className="resource-card-header">
                        <span className={`platform-badge ${res.platform}`}>
                          {getPlatformLabel(res.platform)}
                        </span>

                        {parentTopic && (
                          <button
                            type="button"
                            onClick={() => selectTopic(parentTopic.id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--text-secondary)",
                              fontSize: "11px",
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                          >
                            📁 {parentTopic.title}
                          </button>
                        )}

                        <div className="resource-card-actions">
                          {res.url && (
                            <button
                              type="button"
                              className="note-action-btn"
                              style={{ fontSize: "12px", width: "24px", height: "24px" }}
                              title="Open link in browser"
                              onClick={() => handleOpenExternal(res.url)}
                            >
                              ↗
                            </button>
                          )}
                          <button
                            type="button"
                            className="note-action-btn"
                            style={{ fontSize: "12px", width: "24px", height: "24px" }}
                            title="Edit course"
                            onClick={() => openEditResourceModal(res)}
                          >
                            ✎
                          </button>
                        </div>
                      </div>

                      <h4 className="resource-card-title">{res.title}</h4>
                      {res.author && (
                        <span className="resource-card-author">by {res.author}</span>
                      )}

                      <div className="resource-progress-control">
                        <div className="resource-progress-meta">
                          <span>Progress: {res.progress}%</span>
                          {res.totalItems && (
                            <span>{res.completedItems ?? 0} / {res.totalItems} lectures</span>
                          )}
                        </div>
                        <div className="resource-progress-bar">
                          <div
                            className={`resource-progress-fill ${res.progress >= 100 ? "completed" : ""}`}
                            style={{ width: `${res.progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="resource-card-footer">
                        <span className={`resource-status-badge ${res.status}`}>
                          {getStatusLabel(res.status)}
                        </span>
                        <button
                          type="button"
                          className={`resource-notes-toggle-btn ${res.notes ? "has-notes" : ""}`}
                          onClick={() => openNoteModal({ resource: res })}
                        >
                          📝 {res.notes ? "View Notes" : "+ Add Notes"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
