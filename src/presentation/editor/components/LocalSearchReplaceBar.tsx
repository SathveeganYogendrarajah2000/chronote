import React, { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import type { SearchAndReplaceState } from "../extensions/SearchAndReplaceExtension";

export interface LocalSearchReplaceBarProps {
  editor: Editor | null;
  state: SearchAndReplaceState | null;
  onClose: () => void;
}

export const LocalSearchReplaceBar: React.FC<LocalSearchReplaceBarProps> = ({
  editor,
  state,
  onClose,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when bar opens
  useEffect(() => {
    if (state?.isOpen) {
      setTimeout(() => {
        if (state.isReplaceOpen && state.searchTerm) {
          replaceInputRef.current?.focus();
          replaceInputRef.current?.select();
        } else {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      }, 50);
    }
  }, [state?.isOpen, state?.isReplaceOpen]);

  if (!editor || !state || !state.isOpen) {
    return null;
  }

  const matchCount = state.results.length;
  const currentPos = matchCount > 0 && state.currentIndex >= 0 ? state.currentIndex + 1 : 0;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    editor.commands.setSearchTerm(e.target.value);
  };

  const handleReplaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    editor.commands.setReplaceTerm(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        editor.commands.goToPrevMatch();
      } else {
        editor.commands.goToNextMatch();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleReplaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey || e.ctrlKey) {
        editor.commands.replaceAllMatches();
      } else {
        editor.commands.replaceCurrentMatch();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const toggleReplace = () => {
    editor.commands.openSearch(!state.isReplaceOpen);
  };

  const toggleCase = () => {
    editor.commands.setCaseSensitive(!state.caseSensitive);
  };

  return (
    <div
      className="local-search-bar-container"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      {/* Row 1: Find */}
      <div className="local-search-row">
        <button
          type="button"
          className={`local-search-toggle-replace-btn ${state.isReplaceOpen ? "open" : ""}`}
          onClick={toggleReplace}
          title={state.isReplaceOpen ? "Hide Replace" : "Toggle Replace (Ctrl+R)"}
          aria-label="Toggle Replace"
        >
          {state.isReplaceOpen ? "▼" : "▶"}
        </button>

        <div className="local-search-input-wrapper">
          <input
            ref={searchInputRef}
            type="text"
            className="local-search-input"
            placeholder="Find in note..."
            value={state.searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
          />
          <span className="local-search-counter">
            {state.searchTerm
              ? matchCount > 0
                ? `${currentPos} of ${matchCount}`
                : "No results"
              : ""}
          </span>
        </div>

        <button
          type="button"
          className={`local-search-btn-icon ${state.caseSensitive ? "active" : ""}`}
          onClick={toggleCase}
          title="Match Case (Aa)"
        >
          Aa
        </button>

        <button
          type="button"
          className="local-search-btn-icon"
          onClick={() => editor.commands.goToPrevMatch()}
          disabled={matchCount === 0}
          title="Previous Match (Shift+Enter)"
        >
          ↑
        </button>

        <button
          type="button"
          className="local-search-btn-icon"
          onClick={() => editor.commands.goToNextMatch()}
          disabled={matchCount === 0}
          title="Next Match (Enter)"
        >
          ↓
        </button>

        <button
          type="button"
          className="local-search-btn-icon close-btn"
          onClick={onClose}
          title="Close (Escape)"
        >
          ×
        </button>
      </div>

      {/* Row 2: Replace */}
      {state.isReplaceOpen && (
        <div className="local-replace-row">
          <div className="local-replace-indent" />
          <input
            ref={replaceInputRef}
            type="text"
            className="local-replace-input"
            placeholder="Replace with..."
            value={state.replaceTerm}
            onChange={handleReplaceChange}
            onKeyDown={handleReplaceKeyDown}
          />

          <button
            type="button"
            className="local-replace-action-btn"
            onClick={() => editor.commands.replaceCurrentMatch()}
            disabled={matchCount === 0}
            title="Replace current match"
          >
            Replace
          </button>

          <button
            type="button"
            className="local-replace-action-btn"
            onClick={() => editor.commands.replaceAllMatches()}
            disabled={matchCount === 0}
            title="Replace all matches"
          >
            All
          </button>
        </div>
      )}
    </div>
  );
};

