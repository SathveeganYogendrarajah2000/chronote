import React, { useState, useMemo, useEffect } from "react";
import { useDsmStore, getTodayIsoDate } from "@application/stores/useDsmStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { performanceProfiler } from "@application/services/performanceProfiler";
import { sortDsmEntries } from "@domain/dsm.utils";
import { DsmEntryItem } from "./DsmEntryItem";
import { DsmDatePicker } from "./DsmDatePicker";

export const DsmTimeline: React.FC = () => {
  const {
    dsmDoc,
    isLoading,
    isSaving,
    isDirty,
    selectedTag,
    setSelectedTag,
    setAllCollapse,
    jumpToDate,
    createOrGetEntry,
  } = useDsmStore();

  const { workspace } = useWorkspaceStore();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Mark startup timeline rendering complete for diagnostics
  useEffect(() => {
    performanceProfiler.mark("timeline_rendered");
  }, []);

  const sortOrder = workspace?.settings?.dsmSortOrder ?? "desc";

  const allEntries = useMemo(() => {
    if (!dsmDoc || !dsmDoc.entries) return [];
    return sortDsmEntries(dsmDoc.entries, sortOrder);
  }, [dsmDoc, sortOrder]);

  const availableTags = useMemo(() => {
    if (!dsmDoc?.entries) return [];
    const counts = new Map<string, number>();
    for (const e of dsmDoc.entries) {
      for (const t of e.tags) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [dsmDoc?.entries]);

  const entries = useMemo(() => {
    if (!selectedTag) return allEntries;
    return allEntries.filter((e) => e.tags.includes(selectedTag));
  }, [allEntries, selectedTag]);

  const handleJumpToToday = () => {
    const today = getTodayIsoDate();
    jumpToDate(today);
  };

  const handleSelectDateFromPicker = (date: string) => {
    jumpToDate(date);
  };

  if (isLoading) {
    return (
      <div className="dsm-timeline-wrapper" style={{ alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading stand-up entries...</p>
      </div>
    );
  }

  return (
    <div className="dsm-timeline-wrapper">
      {/* Top Header & Toolbar */}
      <header className="dsm-header-bar">
        <div className="dsm-title-group">
          <h1 className="dsm-title">Daily Stand-up Journal</h1>
          <p className="dsm-subtitle">
            One continuous engineering journal. Every calendar date is an independently addressable, taggable entry.
          </p>
        </div>

        <div className="dsm-toolbar-actions">
          {/* Autosave Status Indicator */}
          <div className={`dsm-save-status ${isSaving ? "saving" : ""}`}>
            {isSaving ? (
              <>
                <span className="dsm-save-status-dot" />
                <span>Saving...</span>
              </>
            ) : isDirty ? (
              <span>● Unsaved</span>
            ) : (
              <span>✓ Saved</span>
            )}
          </div>

          {/* Action Buttons */}
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: "var(--font-size-xs)", padding: "var(--space-1) var(--space-3)" }}
            onClick={handleJumpToToday}
            title="Jump directly to Today's stand-up (Ctrl+Shift+D)"
          >
            Today
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: "var(--font-size-xs)", padding: "var(--space-1) var(--space-3)" }}
            onClick={() => setIsDatePickerOpen(true)}
            title="Open calendar to jump to any historical date"
          >
            Jump to Date...
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: "var(--font-size-xs)", padding: "var(--space-1) var(--space-3)" }}
            onClick={() => setAllCollapse(true)}
            title="Collapse all date entries to view summaries"
          >
            Collapse All
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: "var(--font-size-xs)", padding: "var(--space-1) var(--space-3)" }}
            onClick={() => setAllCollapse(false)}
            title="Expand all date entries"
          >
            Expand All
          </button>

          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: "var(--font-size-xs)", padding: "var(--space-1) var(--space-3)" }}
            onClick={() => setIsDatePickerOpen(true)}
            title="Add or navigate to a date entry"
          >
            + New Date
          </button>
        </div>
      </header>

      {/* Tag Filter Bar */}
      {availableTags.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
            padding: "8px 0 var(--space-3) 0",
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: "var(--space-4)",
          }}
        >
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginRight: 4 }}>
            Filter by tag:
          </span>
          <button
            type="button"
            className={`tag-chip ${!selectedTag ? "active" : ""}`}
            onClick={() => setSelectedTag(null)}
            style={{
              cursor: "pointer",
              backgroundColor: !selectedTag ? "var(--accent-primary)" : "var(--bg-surface)",
              color: !selectedTag ? "#ffffff" : "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-full)",
              padding: "2px 10px",
              fontSize: "var(--font-size-xs)",
              fontWeight: 500,
            }}
          >
            All ({allEntries.length})
          </button>
          {availableTags.map(({ tag, count }) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                className={`tag-chip ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedTag(isSelected ? null : tag)}
                style={{
                  cursor: "pointer",
                  backgroundColor: isSelected ? "var(--accent-primary)" : "var(--bg-surface)",
                  color: isSelected ? "#ffffff" : "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-full)",
                  padding: "2px 10px",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: 500,
                }}
              >
                #{tag} <span style={{ opacity: 0.75, fontSize: "10px" }}>({count})</span>
              </button>
            );
          })}
          {selectedTag && (
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent-hover)",
                fontSize: "var(--font-size-xs)",
                cursor: "pointer",
                padding: "2px 6px",
                marginLeft: 4,
              }}
            >
              Clear filter ×
            </button>
          )}
        </div>
      )}

      {/* Main Timeline Entries Stream */}
      {entries.length === 0 ? (
        selectedTag ? (
          <div className="dsm-empty-state">
            <div className="dsm-empty-icon">🏷️</div>
            <h3 className="dsm-empty-title">No Entries Tagged #{selectedTag}</h3>
            <p className="dsm-empty-subtitle">
              There are no stand-up entries matching this tag.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSelectedTag(null)}
              style={{ marginTop: 8 }}
            >
              Show all stand-up entries
            </button>
          </div>
        ) : (
          <div className="dsm-empty-state">
            <div className="dsm-empty-icon">📅</div>
            <h3 className="dsm-empty-title">No Stand-up Entries Found</h3>
            <p className="dsm-empty-subtitle">
              Start capturing your technical investigations, blockers, queries, and daily progress.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const today = getTodayIsoDate();
                createOrGetEntry(today, ["engineering"], "- Stand-up started:");
                jumpToDate(today);
              }}
            >
              Start Today's Stand-up
            </button>
          </div>
        )
      ) : (
        <main className="dsm-timeline-stream">
          {entries.map((entry) => (
            <DsmEntryItem key={entry.id} entry={entry} />
          ))}
        </main>
      )}

      {/* Date Picker Modal */}
      <DsmDatePicker
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSelectDate={handleSelectDateFromPicker}
      />
    </div>
  );
};
