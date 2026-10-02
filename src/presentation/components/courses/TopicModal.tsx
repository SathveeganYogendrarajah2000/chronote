import React, { useState, useEffect, useMemo } from "react";
import { useCoursesStore } from "@application/stores/useCoursesStore";
import type { LearningPlatform, LearningStatus } from "@domain/courses.types";
import { TagPicker } from "../common/TagPicker";

export const TopicModal: React.FC = () => {
  const {
    isTopicModalOpen,
    editingTopic,
    parentTopicIdForNewTopic,
    coursesDoc,
    createTopic,
    updateTopic,
    closeTopicModal,
  } = useCoursesStore();

  const [title, setTitle] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState<string>("");
  const [url, setUrl] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<LearningStatus>("not_started");
  const [progress, setProgress] = useState<number>(0);
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isTopicModalOpen) {
      if (editingTopic) {
        setTitle(editingTopic.title);
        setParentId(editingTopic.parentId);
        setDescription(editingTopic.description);
        setPlatform(editingTopic.platform ?? "");
        setUrl(editingTopic.url ?? "");
        setAuthor(editingTopic.author ?? "");
        setStatus(editingTopic.status ?? "not_started");
        setProgress(editingTopic.progress ?? 0);
        setTags(editingTopic.tags);
      } else {
        setTitle("");
        setParentId(parentTopicIdForNewTopic ?? null);
        setDescription("");
        setPlatform("");
        setUrl("");
        setAuthor("");
        setStatus("not_started");
        setProgress(0);
        setTags([]);
      }
      setError(null);
    }
  }, [isTopicModalOpen, editingTopic, parentTopicIdForNewTopic]);

  // List valid parent options (exclude self and any descendants to prevent cycles)
  const validParentOptions = useMemo(() => {
    if (!coursesDoc) return [];
    if (!editingTopic) return coursesDoc.topics;

    const excludedIds = new Set<string>([editingTopic.id]);
    // Find all children recursively to exclude
    const queue = [editingTopic.id];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const children = coursesDoc.topics.filter((t) => t.parentId === cur);
      for (const ch of children) {
        excludedIds.add(ch.id);
        queue.push(ch.id);
      }
    }

    return coursesDoc.topics.filter((t) => !excludedIds.has(t.id));
  }, [coursesDoc, editingTopic]);

  if (!isTopicModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Topic title is required");
      return;
    }

    const cleanPlatform = platform ? (platform as LearningPlatform) : undefined;

    if (editingTopic) {
      updateTopic(editingTopic.id, {
        title: title.trim(),
        parentId,
        description: description.trim(),
        tags,
        platform: cleanPlatform,
        url: url.trim(),
        author: author.trim(),
        status,
        progress: Number(progress) || 0,
      });
    } else {
      createTopic({
        title: title.trim(),
        parentId,
        description: description.trim(),
        tags,
        platform: cleanPlatform,
        url: url.trim(),
        author: author.trim(),
        status,
        progress: Number(progress) || 0,
      });
    }

    closeTopicModal();
  };

  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="courses-modal-backdrop" onClick={closeTopicModal}>
      <div
        className="courses-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="courses-modal-header">
          <h3 className="courses-modal-title">
            {editingTopic ? "Edit Topic / Subtopic" : parentId ? "Create Subtopic" : "Create Root Topic"}
          </h3>
          <button
            type="button"
            className="tab-close-btn"
            onClick={closeTopicModal}
            title="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="courses-modal-body">
          {error && (
            <div style={{ color: "#ef4444", fontSize: "12px", background: "rgba(239, 68, 68, 0.1)", padding: "6px 10px", borderRadius: "4px" }}>
              {error}
            </div>
          )}

          <div className="courses-form-group">
            <label className="courses-form-label">Topic Title *</label>
            <input
              type="text"
              className="courses-form-input"
              placeholder="e.g. Distributed Systems, Rust Concurrency, System Design"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
            />
          </div>

          <div className="courses-form-group">
            <label className="courses-form-label">Parent Topic (Optional for nesting)</label>
            <select
              className="courses-form-select"
              value={parentId ?? ""}
              onChange={(e) => setParentId(e.target.value ? e.target.value : null)}
            >
              <option value="">None (Top-Level Root Topic)</option>
              {validParentOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.parentId ? "↳ " : ""}{opt.title}
                </option>
              ))}
            </select>
          </div>

          <div className="courses-form-group">
            <label className="courses-form-label">Description / Goal (Optional)</label>
            <textarea
              className="courses-form-textarea"
              rows={2}
              placeholder="What are you learning or investigating under this topic?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Optional Course / Resource Association */}
          <div style={{ padding: "10px 12px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: "10px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-hover)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Course / Platform Details (Optional)
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label className="courses-form-label">Platform</label>
                <select
                  className="courses-form-select"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <option value="">None / General Study Topic</option>
                  <option value="udemy">Udemy Course</option>
                  <option value="youtube">YouTube Series / Video</option>
                  <option value="article">Article / Paper</option>
                  <option value="course">Online Course</option>
                  <option value="book">Book</option>
                  <option value="documentation">Official Documentation</option>
                  <option value="other">Other Platform</option>
                </select>
              </div>

              <div>
                <label className="courses-form-label">Instructor / Author</label>
                <input
                  type="text"
                  className="courses-form-input"
                  placeholder="e.g. Stephane Maarek, Alex Xu"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="courses-form-label">Course / Web Link URL</label>
              <input
                type="url"
                className="courses-form-input"
                placeholder="https://www.udemy.com/course/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label className="courses-form-label">Learning Status</label>
                <select
                  className="courses-form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LearningStatus)}
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>

              <div>
                <label className="courses-form-label">Progress: {progress}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    setProgress(p);
                    if (p >= 100) setStatus("completed");
                    else if (p > 0 && status === "not_started") setStatus("in_progress");
                  }}
                  style={{ width: "100%", accentColor: "var(--accent-hover)", marginTop: 8 }}
                />
              </div>
            </div>
          </div>

          <div className="courses-form-group">
            <label className="courses-form-label">Tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "rgba(59, 130, 246, 0.2)",
                    color: "#60a5fa",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "11px",
                  }}
                >
                  #{tag}
                  <span
                    style={{ cursor: "pointer", opacity: 0.8 }}
                    onClick={() => handleRemoveTag(tag)}
                  >
                    ×
                  </span>
                </span>
              ))}
              <TagPicker currentTags={tags} onAddTag={handleAddTag} size="small" />
            </div>
          </div>

          <div className="courses-modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={closeTopicModal}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              {editingTopic ? "Save Changes" : "Create Topic"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
