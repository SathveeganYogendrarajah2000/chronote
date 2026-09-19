import React, { useEffect, useRef } from "react";
import { useUiStore } from "@application/stores/useUiStore";
import { useSearchStore } from "@application/stores/useSearchStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useNotesStore } from "@application/stores/useNotesStore";
import { useDsmStore } from "@application/stores/useDsmStore";
import { DSM_TAB_ID } from "@domain/tabs.types";
import { SEARCH_FILTER_SUGGESTIONS, type SearchResultItem } from "@domain/search.types";
import { isQueryEmpty } from "@domain/search.parser";

export const SearchModal: React.FC = () => {
  const { searchModalOpen, setSearchModalOpen } = useUiStore();
  const {
    rawQuery,
    ast,
    results,
    isSearching,
    selectedIndex,
    recentQueries,
    setQuery,
    selectNextResult,
    selectPrevResult,
    appendFilter,
    clearSearch,
  } = useSearchStore();

  const { openTab, switchTab } = useTabsStore();
  const { loadNote } = useNotesStore();
  const { jumpToDate } = useDsmStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (searchModalOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [searchModalOpen]);

  // Scroll selected result into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsContainerRef.current) {
      const selectedEl = resultsContainerRef.current.querySelector(
        `[data-result-index="${selectedIndex}"]`
      );
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  if (!searchModalOpen) return null;

  const handleNavigateToResult = (item: SearchResultItem) => {
    setSearchModalOpen(false);

    // 1. Open / switch to document
    if (item.documentType === "dsm") {
      switchTab(DSM_TAB_ID);
      if (item.entryDate) {
        jumpToDate(item.entryDate);
      }
    } else {
      openTab({
        documentId: item.documentId,
        documentType: "general",
        title: item.documentTitle,
      });
      void loadNote(item.documentId);
    }

    // 2. Smoothly scroll to target block and pulse highlight
    if (typeof document !== "undefined" && item.blockId) {
      setTimeout(() => {
        const el =
          document.querySelector(`[data-block-id="${item.blockId}"]`) ||
          document.getElementById(item.blockId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.remove("block-highlight-pulse");
          // Trigger DOM reflow to restart animation if already pulsed
          void (el as HTMLElement).offsetWidth;
          el.classList.add("block-highlight-pulse");

          setTimeout(() => {
            el.classList.remove("block-highlight-pulse");
          }, 2600);
        }
      }, 120);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setSearchModalOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      selectNextResult();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectPrevResult();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleNavigateToResult(results[selectedIndex]);
      } else if (results.length > 0 && results[0]) {
        handleNavigateToResult(results[0]);
      }
    }
  };

  const queryEmpty = isQueryEmpty(ast);

  return (
    <div
      className="search-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setSearchModalOpen(false);
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="search-modal-dialog" role="dialog" aria-modal="true">
        {/* Search Header Bar */}
        <div className="search-input-header">
          <div className="search-input-icon">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
            </svg>
          </div>

          <input
            ref={inputRef}
            type="text"
            className="search-main-input"
            value={rawQuery}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, stand-ups, code, tags (tag: type: date:)..."
            spellCheck={false}
          />

          {rawQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={clearSearch}
              title="Clear search"
            >
              ✕
            </button>
          )}

          <kbd className="search-esc-hint">ESC</kbd>
        </div>

        {/* Filter Suggestion Chips */}
        <div className="search-filters-bar">
          <span className="search-filter-label">Filters:</span>
          {SEARCH_FILTER_SUGGESTIONS.map((filter) => (
            <button
              key={filter.token}
              type="button"
              className="search-filter-chip"
              onClick={() => {
                appendFilter(filter.token);
                inputRef.current?.focus();
              }}
              title={filter.description}
            >
              {filter.token}
            </button>
          ))}
        </div>

        {/* Results / Empty State */}
        <div className="search-results-container" ref={resultsContainerRef}>
          {isSearching && (
            <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--font-size-sm)" }}>
              Searching workspace...
            </div>
          )}

          {!isSearching && queryEmpty && (
            <div>
              {recentQueries.length > 0 && (
                <div className="search-recent-section">
                  <div className="search-recent-title">Recent Searches</div>
                  {recentQueries.map((query) => (
                    <div
                      key={query}
                      className="search-recent-item"
                      onClick={() => setQuery(query)}
                    >
                      <span>🔍 {query}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Jump</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="search-empty-state">
                <div className="search-empty-icon">⚡</div>
                <div className="search-empty-title">Instant Workspace Search</div>
                <div className="search-empty-hints">
                  <div><code>tag:springboot</code> &mdash; Match notes or days with tag</div>
                  <div><code>type:code lang:sql</code> &mdash; Search code blocks</div>
                  <div><code>type:dsm after:2026-09-01</code> &mdash; Daily stand-up date range</div>
                  <div><code>"exact phrase"</code> &mdash; Exact quoted tokens</div>
                  <div><code>spring*</code> &mdash; Prefix token matching</div>
                </div>
              </div>
            </div>
          )}

          {!isSearching && !queryEmpty && results.length === 0 && (
            <div className="search-empty-state">
              <div className="search-empty-icon">📂</div>
              <div className="search-empty-title">No matching blocks found</div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                Try adjusting your search terms or removing filter predicates.
              </div>
            </div>
          )}

          {!isSearching &&
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.documentId}_${item.blockId}_${idx}`}
                  data-result-index={idx}
                  className={`search-result-item ${isSelected ? "selected" : ""}`}
                  onClick={() => handleNavigateToResult(item)}
                >
                  <div className="search-result-header">
                    <span
                      className={`search-doc-type-badge ${item.documentType}`}
                    >
                      {item.documentType === "dsm" ? "DSM" : "NOTE"}
                    </span>

                    <span className="search-result-title">
                      {item.documentTitle}
                    </span>

                    {item.blockType && (
                      <span className="search-block-type-badge">
                        {item.language ? `${item.blockType}: ${item.language}` : item.blockType}
                      </span>
                    )}

                    {item.entryDate && (
                      <span className="search-date-badge">📅 {item.entryDate}</span>
                    )}

                    {item.tags.map((tag) => (
                      <span key={tag} className="search-result-tag">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div
                    className="search-result-excerpt"
                    dangerouslySetInnerHTML={{ __html: item.excerpt }}
                  />
                </div>
              );
            })}
        </div>

        {/* Footer shortcuts hint */}
        <div className="search-modal-footer">
          <div className="search-footer-shortcuts">
            <span className="search-shortcut-item">
              <kbd>↑</kbd> <kbd>↓</kbd> Navigate
            </span>
            <span className="search-shortcut-item">
              <kbd>↵</kbd> Open
            </span>
            <span className="search-shortcut-item">
              <kbd>ESC</kbd> Close
            </span>
          </div>
          <div>{results.length > 0 ? `${results.length} results (< 50ms)` : ""}</div>
        </div>
      </div>
    </div>
  );
};
