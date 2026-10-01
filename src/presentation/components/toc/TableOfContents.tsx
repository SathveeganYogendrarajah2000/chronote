import React, { useMemo, useState } from "react";
import { useTocStore } from "@application/stores/useTocStore";
import { useNotesStore } from "@application/stores/useNotesStore";
import { useDsmStore, getTodayIsoDate } from "@application/stores/useDsmStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { extractHeadings } from "@domain/toc.utils";
import type { TocHeadingItem } from "@domain/toc.utils";

interface TableOfContentsProps {
  onHeadingClick?: (heading: TocHeadingItem) => void;
  showContextBanner?: boolean;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  onHeadingClick,
  showContextBanner = true,
}) => {
  const { activeContext, activeHeadingId, scrollToHeading, setActiveContext } = useTocStore();
  const { activeNote } = useNotesStore();
  const { dsmDoc, highlightedDate, jumpToDate } = useDsmStore();
  const { tabs, activeTabId } = useTabsStore();

  const [filterText, setFilterText] = useState("");

  const currentTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  }, [tabs, activeTabId]);

  const isDsmActive = currentTab?.documentType === "dsm";

  // Resolve the active content and metadata based on where cursor is
  const { headings, contextTitle, contextType, activeDsmDate } = useMemo(() => {
    if (isDsmActive) {
      const today = getTodayIsoDate();
      // Prioritize: cursor activeContext date -> highlightedDate -> today -> first entry date
      let date = activeContext?.source === "dsm" && activeContext.date ? activeContext.date : null;
      if (!date) {
        date = highlightedDate || (dsmDoc?.entries.some((e) => e.date === today) ? today : null);
      }
      if (!date && dsmDoc?.entries && dsmDoc.entries.length > 0) {
        date = dsmDoc.entries[0]?.date ?? null;
      }

      const entry = date ? dsmDoc?.entries.find((e) => e.date === date) : null;
      const h = entry ? extractHeadings(entry.content) : [];
      return {
        headings: h,
        contextTitle: date ? `Stand-up (${date})` : "Daily Stand-up",
        contextType: "dsm" as const,
        activeDsmDate: date,
      };
    } else {
      // General note
      const note = activeNote;
      const h = note ? extractHeadings(note.content) : [];
      return {
        headings: h,
        contextTitle: note ? note.title : "General Note",
        contextType: "general" as const,
        activeDsmDate: null,
      };
    }
  }, [isDsmActive, activeContext, highlightedDate, dsmDoc?.entries, activeNote]);

  // Filter headings by search query if user types in search
  const filteredHeadings = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return headings;
    return headings.filter((h) => h.text.toLowerCase().includes(q));
  }, [headings, filterText]);

  const handleSelectHeading = (heading: TocHeadingItem) => {
    scrollToHeading(heading);
    if (onHeadingClick) {
      onHeadingClick(heading);
    }
  };

  const handleSwitchDsmDate = (date: string) => {
    jumpToDate(date);
    setActiveContext({
      source: "dsm",
      documentId: `dsm_${date}`,
      date,
      title: `Stand-up (${date})`,
    });
  };

  return (
    <div className="toc-container">
      {/* Context banner showing which note / stand-up date the cursor is in */}
      {showContextBanner && (
        <div className="toc-context-card">
          <div className="toc-context-title-row">
            <span className="toc-context-name" title={contextTitle}>
              {contextType === "dsm" ? "📅 " : "📄 "}
              {contextTitle}
            </span>
            <span className={`toc-context-type-badge ${contextType}`}>
              {contextType === "dsm" ? "DSM" : "NOTE"}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="toc-context-hint">
              {headings.length} {headings.length === 1 ? "heading" : "headings"} in active note
            </span>

            {/* Quick date entry switcher if in DSM mode */}
            {contextType === "dsm" && dsmDoc?.entries && dsmDoc.entries.length > 1 && (
              <select
                aria-label="Switch active DSM entry"
                value={activeDsmDate ?? ""}
                onChange={(e) => handleSwitchDsmDate(e.target.value)}
                style={{
                  fontSize: "10px",
                  background: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-xs)",
                  padding: "1px 4px",
                  outline: "none",
                  cursor: "pointer",
                  maxWidth: "110px",
                }}
              >
                {dsmDoc.entries.map((entry) => (
                  <option key={entry.id} value={entry.date}>
                    {entry.date}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Search filter if there are several headings */}
      {headings.length > 4 && (
        <div className="toc-search-bar">
          <input
            type="text"
            className="toc-search-input"
            placeholder="Filter headings..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
      )}

      {/* Headings List */}
      {filteredHeadings.length === 0 ? (
        <div className="toc-empty-state">
          <div className="toc-empty-icon">📑</div>
          <div className="toc-empty-title">
            {headings.length === 0 ? "No Headings Found" : "No Matching Headings"}
          </div>
          <div className="toc-empty-desc">
            {headings.length === 0 ? (
              <>
                Add structure to this note using <code># Heading 1</code>, <code>## Heading 2</code>, or typing <code>/h1</code>.
              </>
            ) : (
              "Try a different search term to find section headings."
            )}
          </div>
        </div>
      ) : (
        <nav className="toc-list" aria-label="Table of contents">
          {filteredHeadings.map((heading) => {
            const isActive = activeHeadingId === heading.id;
            return (
              <button
                key={`${heading.id}_${heading.index}`}
                type="button"
                className={`toc-item-btn level-${heading.level} ${isActive ? "is-active" : ""}`}
                onClick={() => handleSelectHeading(heading)}
                title={`Jump to ${heading.text} (Level ${heading.level})`}
              >
                <span className={`toc-level-tag h${heading.level}`}>H{heading.level}</span>
                <span className="toc-item-text">{heading.text}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};
