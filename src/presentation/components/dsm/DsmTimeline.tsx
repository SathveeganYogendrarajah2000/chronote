import React, { useState, useMemo, useEffect } from "react";
import { useDsmStore, getTodayIsoDate } from "@application/stores/useDsmStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { useTocStore } from "@application/stores/useTocStore";
import { performanceProfiler } from "@application/services/performanceProfiler";
import { sortDsmEntries, filterDsmEntriesByTags } from "@domain/dsm.utils";
import { extractHeadings } from "@domain/toc.utils";
import { DsmEntryItem } from "./DsmEntryItem";
import { DsmDatePicker } from "./DsmDatePicker";
import { FloatingTocPopover } from "../toc/FloatingTocPopover";

export const DsmTimeline: React.FC = () => {
  const {
    dsmDoc,
    isLoading,
    isSaving,
    isDirty,
    selectedTags,
    toggleTagFilter,
    clearTagFilters,
    tagMatchMode,
    setTagMatchMode,
    setAllCollapse,
    jumpToDate,
    createOrGetEntry,
    highlightedDate,
  } = useDsmStore();

  const { workspace } = useWorkspaceStore();
  const { activeContext, setActiveContext } = useTocStore();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);

  // Mark startup timeline rendering complete for diagnostics
  useEffect(() => {
    performanceProfiler.mark("timeline_rendered");
  }, []);

  // Ensure activeContext tracks DSM entry on mount / highlightedDate change
  useEffect(() => {
    const today = getTodayIsoDate();
    const targetDate =
      highlightedDate ||
      (dsmDoc?.entries.some((e) => e.date === today) ? today : dsmDoc?.entries[0]?.date);

    if (targetDate && (!activeContext || activeContext.source !== "dsm" || !activeContext.date)) {
      setActiveContext({
        source: "dsm",
        documentId: `dsm_${targetDate}`,
        date: targetDate,
        title: `Stand-up (${targetDate})`,
      });
    }
  }, [highlightedDate, dsmDoc?.entries, activeContext, setActiveContext]);

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

  // Multi-tag filtering with AND/OR support
  const entries = useMemo(() => {
    return filterDsmEntriesByTags(allEntries, selectedTags, tagMatchMode);
  }, [allEntries, selectedTags, tagMatchMode]);

  // Headings count for active DSM entry
  const activeEntryHeadingsCount = useMemo(() => {
    const activeDate = activeContext?.date || highlightedDate || allEntries[0]?.date;
    if (!activeDate) return 0;
    const entry = allEntries.find((e) => e.date === activeDate);
    return entry ? extractHeadings(entry.content).length : 0;
  }, [activeContext?.date, highlightedDate, allEntries]);

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

          {/* Quick Table of Contents Trigger */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: "var(--font-size-xs)", padding: "var(--space-1) var(--space-3)", display: "inline-flex", alignItems: "center", gap: 4 }}
              onClick={() => setIsTocOpen(!isTocOpen)}
              title="Table of Contents for active stand-up entry"
            >
              <span>📑 Outline</span>
              {activeEntryHeadingsCount > 0 && (
                <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", opacity: 0.85 }}>
                  ({activeEntryHeadingsCount})
                </span>
              )}
            </button>
            <FloatingTocPopover
              isOpen={isTocOpen}
              onClose={() => setIsTocOpen(false)}
              title={activeContext?.title || "Stand-up Outline"}
            />
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

      {/* Tag Filter Bar with Multi-Tag Support */}
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
            Filter by tags:
          </span>

          <button
            type="button"
            className={`tag-chip ${selectedTags.length === 0 ? "active" : ""}`}
            onClick={clearTagFilters}
            style={{
              cursor: "pointer",
              backgroundColor: selectedTags.length === 0 ? "var(--accent-primary)" : "var(--bg-surface)",
              color: selectedTags.length === 0 ? "#ffffff" : "var(--text-secondary)",
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
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                className={`tag-chip ${isSelected ? "active" : ""}`}
                onClick={() => toggleTagFilter(tag)}
                style={{
                  cursor: "pointer",
                  backgroundColor: isSelected ? "var(--accent-primary)" : "var(--bg-surface)",
                  color: isSelected ? "#ffffff" : "var(--text-secondary)",
                  border: isSelected ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-full)",
                  padding: "2px 10px",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                title={isSelected ? `Click to remove #${tag} filter` : `Click to filter by #${tag}`}
              >
                <span>#{tag}</span>
                <span style={{ opacity: 0.75, fontSize: "10px" }}>({count})</span>
                {isSelected && <span style={{ fontSize: "11px", marginLeft: 2 }}>✕</span>}
              </button>
            );
          })}

          {selectedTags.length > 1 && (
            <div className="tag-match-toggle" title="Toggle between matching ALL selected tags or ANY selected tag">
              <span style={{ padding: "0 4px", color: "var(--text-muted)" }}>Match:</span>
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

          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={clearTagFilters}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent-hover)",
                fontSize: "var(--font-size-xs)",
                cursor: "pointer",
                padding: "2px 6px",
                marginLeft: 4,
              }}
              title="Clear all tag filters"
            >
              Clear filters ×
            </button>
          )}
        </div>
      )}

      {/* Main Timeline Entries Stream */}
      {entries.length === 0 ? (
        selectedTags.length > 0 ? (
          <div className="dsm-empty-state">
            <div className="dsm-empty-icon">🏷️</div>
            <h3 className="dsm-empty-title">
              No Entries Tagged #{selectedTags.join(", #")}
            </h3>
            <p className="dsm-empty-subtitle">
              There are no stand-up entries matching {tagMatchMode === "and" ? "all" : "any"} of these tags.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={clearTagFilters}
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
