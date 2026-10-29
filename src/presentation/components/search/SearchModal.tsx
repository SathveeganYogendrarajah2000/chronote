import React, { useEffect, useRef, useState, useMemo } from "react";
import { useUiStore } from "@application/stores/useUiStore";
import { useSearchStore } from "@application/stores/useSearchStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useNotesStore } from "@application/stores/useNotesStore";
import { useDsmStore } from "@application/stores/useDsmStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { DSM_TAB_ID } from "@domain/tabs.types";
import { SEARCH_FILTER_SUGGESTIONS, type SearchResultItem } from "@domain/search.types";
import { isQueryEmpty } from "@domain/search.parser";
import { replaceTextInProseMirrorDoc } from "@domain/replace.utils";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";

export const SearchModal: React.FC = () => {
  const { searchModalOpen, setSearchModalOpen, searchModalMode, setSearchModalMode } = useUiStore();
  const {
    rawQuery,
    ast,
    results,
    isSearching,
    selectedIndex,
    recentQueries,
    setQuery,
    executeSearch,
    selectNextResult,
    selectPrevResult,
    appendFilter,
    clearSearch,
  } = useSearchStore();

  const { openTab, switchTab } = useTabsStore();
  const { loadNote } = useNotesStore();
  const { jumpToDate } = useDsmStore();

  const [replaceQuery, setReplaceQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (searchModalOpen) {
      setStatusMessage(null);
      setTimeout(() => {
        if (searchModalMode === "replace" && rawQuery) {
          replaceInputRef.current?.focus();
          replaceInputRef.current?.select();
        } else {
          inputRef.current?.focus();
          inputRef.current?.select();
        }
      }, 50);
    }
  }, [searchModalOpen, searchModalMode]);

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

  const uniqueDocIds = useMemo(() => {
    return Array.from(new Set(results.map((r) => r.documentId)));
  }, [results]);

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

  // Replace text in a single specific document
  const handleReplaceInDocument = async (docId: string, docType: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const query = rawQuery.trim();
    if (!query) return;

    setIsReplacing(true);
    let totalMatches = 0;

    try {
      if (docType === "dsm") {
        const dsm = await ipcBridge.readDsmDocument();
        let dsmModified = false;
        const updatedEntries = dsm.entries.map((entry) => {
          const { updatedDoc, matchCount } = replaceTextInProseMirrorDoc(
            entry.content,
            query,
            replaceQuery,
            caseSensitive
          );
          if (matchCount > 0) {
            dsmModified = true;
            totalMatches += matchCount;
            return {
              ...entry,
              content: updatedDoc,
              updatedAt: new Date().toISOString(),
            };
          }
          return entry;
        });

        if (dsmModified) {
          await ipcBridge.saveDsmDocument({
            ...dsm,
            entries: updatedEntries,
            updatedAt: new Date().toISOString(),
          });
          await useDsmStore.getState().loadDsm();
        }
      } else {
        const note = await ipcBridge.readGeneralNote(docId);
        const { updatedDoc, matchCount } = replaceTextInProseMirrorDoc(
          note.content,
          query,
          replaceQuery,
          caseSensitive
        );

        if (matchCount > 0) {
          totalMatches += matchCount;
          const updatedNote = {
            ...note,
            content: updatedDoc,
            updatedAt: new Date().toISOString(),
          };
          await ipcBridge.saveGeneralNote(updatedNote);

          // Update active note in store if currently open
          if (useNotesStore.getState().activeNote?.id === docId) {
            useNotesStore.setState({ activeNote: updatedNote });
          }
        }
      }

      await useWorkspaceStore.getState().refreshNotes();
      await executeSearch();
      setStatusMessage(`Replaced ${totalMatches} occurrences in ${docType === "dsm" ? "DSM Journal" : "note"}.`);
    } catch (err) {
      console.error("Failed to replace in document:", err);
      setStatusMessage("Failed to replace: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsReplacing(false);
    }
  };

  // Replace text across ALL matching documents in the workspace
  const handleReplaceAll = async () => {
    const query = rawQuery.trim();
    if (!query || uniqueDocIds.length === 0) return;

    setIsReplacing(true);
    let totalReplaced = 0;
    let docsModified = 0;

    try {
      for (const docId of uniqueDocIds) {
        if (docId === "dsm_master" || docId.startsWith("dsm:")) {
          const dsm = await ipcBridge.readDsmDocument();
          let dsmModified = false;
          const updatedEntries = dsm.entries.map((entry) => {
            const { updatedDoc, matchCount } = replaceTextInProseMirrorDoc(
              entry.content,
              query,
              replaceQuery,
              caseSensitive
            );
            if (matchCount > 0) {
              dsmModified = true;
              totalReplaced += matchCount;
              return {
                ...entry,
                content: updatedDoc,
                updatedAt: new Date().toISOString(),
              };
            }
            return entry;
          });

          if (dsmModified) {
            docsModified++;
            await ipcBridge.saveDsmDocument({
              ...dsm,
              entries: updatedEntries,
              updatedAt: new Date().toISOString(),
            });
            await useDsmStore.getState().loadDsm();
          }
        } else {
          try {
            const note = await ipcBridge.readGeneralNote(docId);
            const { updatedDoc, matchCount } = replaceTextInProseMirrorDoc(
              note.content,
              query,
              replaceQuery,
              caseSensitive
            );

            if (matchCount > 0) {
              totalReplaced += matchCount;
              docsModified++;
              const updatedNote = {
                ...note,
                content: updatedDoc,
                updatedAt: new Date().toISOString(),
              };
              await ipcBridge.saveGeneralNote(updatedNote);

              if (useNotesStore.getState().activeNote?.id === docId) {
                useNotesStore.setState({ activeNote: updatedNote });
              }
            }
          } catch (e) {
            console.error(`Failed to replace in note ${docId}:`, e);
          }
        }
      }

      await useWorkspaceStore.getState().refreshNotes();
      await executeSearch();
      setStatusMessage(`✓ Successfully replaced ${totalReplaced} occurrences across ${docsModified} documents.`);
    } catch (err) {
      console.error("Failed to replace all:", err);
      setStatusMessage("Error during global replacement: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsReplacing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setSearchModalOpen(false);
    } else if (e.key === "ArrowDown" && (e.target === inputRef.current || e.target === replaceInputRef.current)) {
      e.preventDefault();
      selectNextResult();
    } else if (e.key === "ArrowUp" && (e.target === inputRef.current || e.target === replaceInputRef.current)) {
      e.preventDefault();
      selectPrevResult();
    } else if (e.key === "Enter" && e.target === inputRef.current) {
      e.preventDefault();
      if (searchModalMode === "replace") {
        replaceInputRef.current?.focus();
        replaceInputRef.current?.select();
      } else {
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleNavigateToResult(results[selectedIndex]);
        } else if (results.length > 0 && results[0]) {
          handleNavigateToResult(results[0]);
        }
      }
    } else if (e.key === "Enter" && e.target === replaceInputRef.current) {
      e.preventDefault();
      void handleReplaceAll();
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
        {/* Mode Switcher Tabs */}
        <div className="search-mode-switcher">
          <button
            type="button"
            className={`search-mode-tab ${searchModalMode === "find" ? "active" : ""}`}
            onClick={() => {
              setSearchModalMode("find");
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
          >
            Find (Ctrl+Shift+F)
          </button>
          <button
            type="button"
            className={`search-mode-tab ${searchModalMode === "replace" ? "active" : ""}`}
            onClick={() => {
              setSearchModalMode("replace");
              setTimeout(() => replaceInputRef.current?.focus(), 50);
            }}
          >
            Find &amp; Replace (Ctrl+Shift+R)
          </button>
        </div>

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

        {/* Replace Header Bar (if replace mode active) */}
        {searchModalMode === "replace" && (
          <div className="search-replace-header">
            <div className="search-input-icon">
              <span style={{ fontSize: "14px" }}>⇄</span>
            </div>

            <input
              ref={replaceInputRef}
              type="text"
              className="search-replace-input"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="Replace with..."
              spellCheck={false}
            />

            <button
              type="button"
              className={`local-search-btn-icon ${caseSensitive ? "active" : ""}`}
              onClick={() => setCaseSensitive(!caseSensitive)}
              title="Match Case (Aa)"
              style={{ height: 30, padding: "0 8px" }}
            >
              Aa
            </button>

            <button
              type="button"
              className="search-replace-all-btn"
              disabled={isReplacing || queryEmpty || results.length === 0}
              onClick={handleReplaceAll}
              title="Replace all matching occurrences across the workspace"
            >
              {isReplacing
                ? "Replacing..."
                : `Replace All (${results.length} in ${uniqueDocIds.length} doc${uniqueDocIds.length === 1 ? "" : "s"})`}
            </button>
          </div>
        )}

        {/* Status Notification */}
        {statusMessage && (
          <div className="search-replace-status">
            <span>{statusMessage}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
            >
              ×
            </button>
          </div>
        )}

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

                    {searchModalMode === "replace" && (
                      <button
                        type="button"
                        className="search-replace-item-btn"
                        onClick={(e) => handleReplaceInDocument(item.documentId, item.documentType, e)}
                        title="Replace query in this note"
                      >
                        Replace in Note
                      </button>
                    )}
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
              <kbd>↵</kbd> {searchModalMode === "replace" ? "Replace / Open" : "Open"}
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
