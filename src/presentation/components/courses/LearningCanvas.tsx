import React, { useMemo, useEffect } from "react";
import { useCoursesStore } from "@application/stores/useCoursesStore";
import { useTocStore } from "@application/stores/useTocStore";
import {
  getTopicPath,
  calculateTopicProgress,
  calculateOverallCoursesProgress,
  getPlatformLabel,
  getStatusLabel,
} from "@domain/courses.utils";
import type { LearningPlatform, LearningStatus } from "@domain/courses.types";
import type { ProseMirrorNode } from "@domain/document.types";
import { proseMirrorDocToText } from "@domain/note.utils";
import { navigateToNoteOrDsm } from "@application/navigationHelper";
import { ChronoteEditor } from "@presentation/editor/ChronoteEditor";
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
    openCreateTopicModal,
    openEditTopicModal,
    deleteTopic,
    updateTopic,
    updateTopicContent,
    updateTopicProgress,
  } = useCoursesStore();

  const { setActiveContext } = useTocStore();

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

  // Direct child subtopics of the active topic
  const directChildSubtopics = useMemo(() => {
    if (!activeTopic) return [];
    return topics.filter((t) => t.parentId === activeTopic.id);
  }, [topics, activeTopic?.id]);

  // Root topics (parentId === null)
  const rootTopics = useMemo(() => {
    return topics.filter((t) => t.parentId === null);
  }, [topics]);

  // Synchronize TOC and inspector context with the active topic
  useEffect(() => {
    if (activeTopic) {
      setActiveContext({
        source: "courses",
        documentId: activeTopic.id,
        title: activeTopic.title,
      });
    } else {
      setActiveContext({
        source: "courses",
        documentId: "courses_master",
        title: "Course and learning",
      });
    }
  }, [activeTopic?.id, activeTopic?.title, setActiveContext]);

  // Quick stats from topic notes
  const textContent = useMemo(() => {
    if (!activeTopic || !activeTopic.content) return "";
    return proseMirrorDocToText(activeTopic.content);
  }, [activeTopic?.id, activeTopic?.content]);

  const charCount = textContent.length;
  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;

  // Active topic aggregate progress
  const activeTopicProgress = useMemo(() => {
    if (!selectedTopicId) return 0;
    return calculateTopicProgress(selectedTopicId, topics, resources);
  }, [selectedTopicId, topics, resources]);

  // Overall workspace courses progress
  const overallProgress = useMemo(() => {
    return calculateOverallCoursesProgress(topics, resources);
  }, [topics, resources]);

  // Filter root topics on hub
  const filteredRootTopics = useMemo(() => {
    let list = rootTopics;

    if (selectedPlatform && selectedPlatform !== "all") {
      list = list.filter((t) => t.platform === selectedPlatform);
    }

    if (selectedStatus && selectedStatus !== "all") {
      list = list.filter((t) => (t.status ?? "not_started") === selectedStatus);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.author && t.author.toLowerCase().includes(q)) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return list;
  }, [rootTopics, selectedPlatform, selectedStatus, searchQuery]);

  const handleOpenExternal = (url: string) => {
    if (!url) return;
    void ipcBridge.openExternalUrl(url);
  };

  const handleDeleteTopic = (id: string, title: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete topic "${title}"? This will also remove any subtopics and notes under it.`
      )
    ) {
      void deleteTopic(id);
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

  const handleStepProgress = (delta: number) => {
    if (!activeTopic) return;
    const current = activeTopic.progress ?? 0;
    const next = Math.max(0, Math.min(100, current + delta));
    updateTopicProgress(activeTopic.id, next);
  };

  const handleNavigateToNote = (targetId: string) => {
    void navigateToNoteOrDsm(targetId);
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
              + {selectedTopicId ? "New Subtopic" : "New Root Topic"}
            </button>
            {activeTopic && (
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: "var(--font-size-xs)", padding: "4px 10px" }}
                  onClick={() => openEditTopicModal(activeTopic)}
                  title="Edit topic & course details"
                >
                  ✎ Edit Topic
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: "var(--font-size-xs)", padding: "4px 10px", color: "#f87171" }}
                  onClick={() => handleDeleteTopic(activeTopic.id, activeTopic.title)}
                  title="Delete topic"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* VIEW A: Active Topic Notes Canvas */}
      {activeTopic ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", flex: 1 }}>
          {/* Topic Detail Header Banner */}
          <div className="topic-detail-card">
            <div className="topic-detail-header-row">
              <div className="topic-detail-title-area">
                <h1 className="topic-detail-title">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    style={{ color: "var(--accent-hover)", flexShrink: 0 }}
                  >
                    <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
                  </svg>
                  {activeTopic.title}
                </h1>
                {activeTopic.description && (
                  <p className="topic-detail-description">{activeTopic.description}</p>
                )}
              </div>

              {/* Progress & Stepper */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="topic-progress-badge">
                  Progress: {activeTopicProgress}%
                  <div className="topic-progress-bar-mini">
                    <div
                      className="topic-progress-bar-fill"
                      style={{ width: `${activeTopicProgress}%` }}
                    />
                  </div>
                </span>

                <div className="resource-stepper">
                  <button
                    type="button"
                    className="resource-step-btn"
                    title="Decrease progress (-5%)"
                    onClick={() => handleStepProgress(-5)}
                  >
                    -
                  </button>
                  <button
                    type="button"
                    className="resource-step-btn"
                    title="Increase progress (+5%)"
                    onClick={() => handleStepProgress(5)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Course Metadata Row (Platform, URL, Instructor, Status) */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
              {activeTopic.platform && (
                <span className={`platform-badge ${activeTopic.platform}`}>
                  {getPlatformLabel(activeTopic.platform)}
                </span>
              )}

              {activeTopic.url && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "var(--accent-hover)",
                  }}
                  onClick={() => handleOpenExternal(activeTopic.url!)}
                  title={activeTopic.url}
                >
                  <span>↗ Open Course Link</span>
                </button>
              )}

              {activeTopic.author && (
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Instructor: <strong style={{ color: "var(--text-primary)" }}>{activeTopic.author}</strong>
                </span>
              )}

              {activeTopic.status && (
                <span className={`resource-status-badge ${activeTopic.status}`}>
                  {getStatusLabel(activeTopic.status)}
                </span>
              )}

              {directChildSubtopics.length > 0 && (
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  • {directChildSubtopics.length} {directChildSubtopics.length === 1 ? "subtopic" : "subtopics"}
                </span>
              )}
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
          </div>

          {/* Subtopics Bar */}
          <div className="topic-subtopics-bar">
            <span className="topic-subtopics-label">Subtopics:</span>
            {directChildSubtopics.map((sub) => {
              const subProg = calculateTopicProgress(sub.id, topics, resources);
              return (
                <button
                  key={sub.id}
                  type="button"
                  className="topic-subtopic-pill"
                  onClick={() => selectTopic(sub.id)}
                  title={`Open notes for "${sub.title}" (${subProg}%)`}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.8 }}>
                    <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
                  </svg>
                  <span>{sub.title}</span>
                  <span style={{ fontSize: "10px", opacity: 0.75, fontWeight: 600 }}>{subProg}%</span>
                </button>
              );
            })}

            <button
              type="button"
              className="topic-subtopic-pill"
              style={{ borderStyle: "dashed", color: "var(--accent-hover)" }}
              onClick={() => openCreateTopicModal(activeTopic.id)}
            >
              + Add Subtopic
            </button>
          </div>

          {/* The Topic Notes Canvas (ChronoteEditor) */}
          <div className="topic-notes-editor-wrapper">
            <ChronoteEditor
              content={activeTopic.content}
              editorContextKey={`courses_${activeTopic.id}`}
              onChange={(newContent: ProseMirrorNode) => updateTopicContent(activeTopic.id, newContent)}
              onNavigateToNote={handleNavigateToNote}
              onEditorFocus={() => {
                setActiveContext({
                  source: "courses",
                  documentId: activeTopic.id,
                  title: activeTopic.title,
                });
              }}
            />

            <div className="topic-notes-editor-footer">
              <span>
                {wordCount} {wordCount === 1 ? "word" : "words"} • {charCount} characters
              </span>
              <span style={{ fontFamily: "var(--font-mono)", opacity: 0.8 }}>
                Topic ID: {activeTopic.id}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW B: Root Courses Hub */
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {/* Metric Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "var(--space-4)",
            }}
          >
            <div className="topic-detail-card" style={{ padding: "var(--space-4)", margin: 0 }}>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Total Topics
              </span>
              <span style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)" }}>
                {topics.length}
              </span>
            </div>
            <div className="topic-detail-card" style={{ padding: "var(--space-4)", margin: 0 }}>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                In Progress
              </span>
              <span style={{ fontSize: "28px", fontWeight: 700, color: "#60a5fa" }}>
                {topics.filter((t) => t.status === "in_progress").length}
              </span>
            </div>
            <div className="topic-detail-card" style={{ padding: "var(--space-4)", margin: 0 }}>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Completed
              </span>
              <span style={{ fontSize: "28px", fontWeight: 700, color: "#34d399" }}>
                {topics.filter((t) => t.status === "completed").length}
              </span>
            </div>
            <div className="topic-detail-card" style={{ padding: "var(--space-4)", margin: 0 }}>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Overall Progress
              </span>
              <span style={{ fontSize: "28px", fontWeight: 700, color: "var(--accent-hover)" }}>
                {overallProgress}%
              </span>
            </div>
          </div>

          {/* Search & Platform / Status Filters */}
          <div className="learning-filter-toolbar">
            <div className="learning-search-box">
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="currentColor"
                style={{ color: "var(--text-muted)", flexShrink: 0 }}
              >
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
              </svg>
              <input
                type="text"
                className="learning-search-input"
                placeholder="Search topics, instructors, courses, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "12px",
                    padding: 0,
                  }}
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

          {/* Root Topics Section */}
          <div className="subtopics-section">
            <div className="section-title-row">
              <span className="section-title-label">
                Learning Topics ({filteredRootTopics.length})
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

            {filteredRootTopics.length === 0 ? (
              <div className="courses-empty-state">
                <svg width="36" height="36" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.3 }}>
                  <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
                </svg>
                <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-size-base)", margin: 0 }}>
                  {searchQuery ? "No learning topics match your filter." : "No learning topics created yet."}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)", margin: 0, maxWidth: 440 }}>
                  Organize your learning path (e.g. AWS &gt; AWS Cloud Solutions Architect Associate &gt; Subtopics),
                  and take structured study notes with rich markdown, headings, and code snippets.
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
                {filteredRootTopics.map((topic) => {
                  const subtopicCount = topics.filter((t) => t.parentId === topic.id).length;
                  const topicProgress = calculateTopicProgress(topic.id, topics, resources);

                  return (
                    <div
                      key={topic.id}
                      className="subtopic-card"
                      onClick={() => selectTopic(topic.id)}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div className="subtopic-card-title">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            style={{ color: "var(--accent-hover)", flexShrink: 0 }}
                          >
                            <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
                          </svg>
                          <span>{topic.title}</span>
                        </div>

                        {topic.platform && (
                          <span
                            className={`platform-badge ${topic.platform}`}
                            style={{ alignSelf: "flex-start", fontSize: "10px", padding: "1px 6px" }}
                          >
                            {getPlatformLabel(topic.platform)}
                          </span>
                        )}

                        <p className="subtopic-card-desc">
                          {topic.description || "Click to open full notes canvas and subtopics."}
                        </p>
                      </div>

                      <div className="subtopic-card-footer">
                        <span>
                          {subtopicCount} {subtopicCount === 1 ? "subtopic" : "subtopics"}
                        </span>
                        <span style={{ fontWeight: 600, color: "var(--accent-hover)" }}>
                          {topicProgress}%
                        </span>
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
        </div>
      )}
    </div>
  );
};
