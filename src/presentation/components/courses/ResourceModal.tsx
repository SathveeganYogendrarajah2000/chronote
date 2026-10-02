import React, { useState, useEffect } from "react";
import { useCoursesStore } from "@application/stores/useCoursesStore";
import { TagPicker } from "../common/TagPicker";
import type { LearningPlatform, LearningStatus } from "@domain/courses.types";
import { getPlatformLabel, getStatusLabel } from "@domain/courses.utils";

const PLATFORMS: LearningPlatform[] = [
  "udemy",
  "youtube",
  "article",
  "course",
  "book",
  "documentation",
  "other",
];

const STATUSES: LearningStatus[] = [
  "not_started",
  "in_progress",
  "completed",
  "on_hold",
];

export const ResourceModal: React.FC = () => {
  const {
    isResourceModalOpen,
    editingResource,
    topicIdForNewResource,
    coursesDoc,
    createResource,
    updateResource,
    closeResourceModal,
  } = useCoursesStore();

  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState("");
  const [platform, setPlatform] = useState<LearningPlatform>("udemy");
  const [url, setUrl] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<LearningStatus>("not_started");
  const [progress, setProgress] = useState(0);
  const [completedItems, setCompletedItems] = useState<number | undefined>(undefined);
  const [totalItems, setTotalItems] = useState<number | undefined>(undefined);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isResourceModalOpen) {
      if (editingResource) {
        setTitle(editingResource.title);
        setTopicId(editingResource.topicId);
        setPlatform(editingResource.platform);
        setUrl(editingResource.url);
        setAuthor(editingResource.author);
        setStatus(editingResource.status);
        setProgress(editingResource.progress);
        setCompletedItems(editingResource.completedItems);
        setTotalItems(editingResource.totalItems);
        setRating(editingResource.rating);
        setTags(editingResource.tags);
        setNotes(typeof editingResource.notes === "string" ? editingResource.notes : "");
      } else {
        setTitle("");
        setTopicId(topicIdForNewResource || coursesDoc?.topics[0]?.id || "");
        setPlatform("udemy");
        setUrl("");
        setAuthor("");
        setStatus("not_started");
        setProgress(0);
        setCompletedItems(undefined);
        setTotalItems(undefined);
        setRating(undefined);
        setTags([]);
        setNotes("");
      }
      setError(null);
    }
  }, [isResourceModalOpen, editingResource, topicIdForNewResource, coursesDoc]);

  if (!isResourceModalOpen) return null;

  const handleTotalChange = (val: string) => {
    const num = val === "" ? undefined : parseInt(val, 10);
    setTotalItems(num);
    if (num && num > 0 && completedItems !== undefined) {
      const calc = Math.min(100, Math.round((completedItems / num) * 100));
      setProgress(calc);
      if (calc >= 100) setStatus("completed");
      else if (calc > 0 && status === "not_started") setStatus("in_progress");
    }
  };

  const handleCompletedChange = (val: string) => {
    const num = val === "" ? undefined : parseInt(val, 10);
    setCompletedItems(num);
    if (totalItems && totalItems > 0 && num !== undefined) {
      const calc = Math.min(100, Math.round((num / totalItems) * 100));
      setProgress(calc);
      if (calc >= 100) setStatus("completed");
      else if (calc > 0 && status === "not_started") setStatus("in_progress");
    }
  };

  const handleProgressSlider = (val: number) => {
    setProgress(val);
    if (totalItems && totalItems > 0) {
      setCompletedItems(Math.round((val / 100) * totalItems));
    }
    if (val >= 100) setStatus("completed");
    else if (val > 0 && status === "not_started") setStatus("in_progress");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Course or resource title is required");
      return;
    }
    if (!topicId) {
      setError("Please select a topic or subtopic for this course");
      return;
    }

    if (editingResource) {
      updateResource(editingResource.id, {
        title: title.trim(),
        topicId,
        platform,
        url: url.trim(),
        author: author.trim(),
        status,
        progress,
        completedItems,
        totalItems,
        rating,
        tags,
        notes,
      });
    } else {
      createResource({
        topicId,
        title: title.trim(),
        platform,
        url: url.trim(),
        author: author.trim(),
        status,
        progress,
        completedItems,
        totalItems,
        rating,
        tags,
        notes,
      });
    }

    closeResourceModal();
  };

  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag)) setTags([...tags, tag]);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="courses-modal-backdrop" onClick={closeResourceModal}>
      <div
        className="courses-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="courses-modal-header">
          <h3 className="courses-modal-title">
            {editingResource ? "Edit Course / Resource" : "Add Course / Resource"}
          </h3>
          <button
            type="button"
            className="tab-close-btn"
            onClick={closeResourceModal}
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
            <label className="courses-form-label">Course / Resource Title *</label>
            <input
              type="text"
              className="courses-form-input"
              placeholder="e.g. Distributed Systems Lectures, Complete SQL Bootcamp"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="courses-form-group">
              <label className="courses-form-label">Topic / Subtopic *</label>
              <select
                className="courses-form-select"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
              >
                {coursesDoc?.topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.parentId ? "↳ " : ""}{t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="courses-form-group">
              <label className="courses-form-label">Platform / Type</label>
              <select
                className="courses-form-select"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as LearningPlatform)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {getPlatformLabel(p)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="courses-form-group">
              <label className="courses-form-label">Instructor / Author</label>
              <input
                type="text"
                className="courses-form-input"
                placeholder="e.g. Martin Kleppmann, Hussein Nasser"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>

            <div className="courses-form-group">
              <label className="courses-form-label">Status</label>
              <select
                className="courses-form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as LearningStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {getStatusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="courses-form-group">
            <label className="courses-form-label">URL / Course Link</label>
            <input
              type="text"
              className="courses-form-input"
              placeholder="https://www.udemy.com/course/... or https://youtube.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          {/* Progress Section */}
          <div className="courses-form-group" style={{ background: "rgba(0, 0, 0, 0.15)", padding: "10px", borderRadius: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label className="courses-form-label" style={{ margin: 0 }}>Progress: {progress}%</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "11px", color: "var(--text-secondary)" }}>
                <span>Completed:</span>
                <input
                  type="number"
                  min="0"
                  max={totalItems ?? 1000}
                  className="courses-form-input"
                  style={{ width: "55px", padding: "2px 6px" }}
                  placeholder="0"
                  value={completedItems ?? ""}
                  onChange={(e) => handleCompletedChange(e.target.value)}
                />
                <span>/</span>
                <input
                  type="number"
                  min="1"
                  className="courses-form-input"
                  style={{ width: "55px", padding: "2px 6px" }}
                  placeholder="Total"
                  value={totalItems ?? ""}
                  onChange={(e) => handleTotalChange(e.target.value)}
                />
                <span>lectures</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => handleProgressSlider(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent-primary)", cursor: "pointer" }}
            />
          </div>

          {/* Rating */}
          <div className="courses-form-group">
            <label className="courses-form-label">Rating (Optional)</label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? undefined : star)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "18px",
                    color: rating && star <= rating ? "#fbbf24" : "var(--text-muted)",
                    padding: 0,
                  }}
                  title={`Rate ${star} star${star > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
              {rating && (
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  ({rating} / 5)
                </span>
              )}
            </div>
          </div>

          {/* Tags */}
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

          {/* Notes */}
          <div className="courses-form-group">
            <label className="courses-form-label">Study Notes & Key Takeaways</label>
            <textarea
              className="courses-form-textarea"
              rows={4}
              placeholder="Capture takeaways, important timestamps, tips, or review points..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="courses-modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={closeResourceModal}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              {editingResource ? "Save Changes" : "Add Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
