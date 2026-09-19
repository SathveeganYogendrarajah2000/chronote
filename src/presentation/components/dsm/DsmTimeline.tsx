import React, { useState, useMemo } from "react";
import { useDsmStore, getTodayIsoDate } from "@application/stores/useDsmStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { sortDsmEntries } from "@domain/dsm.utils";
import { DsmEntryItem } from "./DsmEntryItem";
import { DsmDatePicker } from "./DsmDatePicker";

export const DsmTimeline: React.FC = () => {
  const {
    dsmDoc,
    isLoading,
    isSaving,
    isDirty,
    setAllCollapse,
    jumpToDate,
    createOrGetEntry,
  } = useDsmStore();

  const { workspace } = useWorkspaceStore();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const sortOrder = workspace?.settings?.dsmSortOrder ?? "desc";

  const entries = useMemo(() => {
    if (!dsmDoc || !dsmDoc.entries) return [];
    return sortDsmEntries(dsmDoc.entries, sortOrder);
  }, [dsmDoc, sortOrder]);

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

      {/* Main Timeline Entries Stream */}
      {entries.length === 0 ? (
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
