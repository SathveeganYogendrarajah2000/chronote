import React, { useState, useRef, useEffect, useMemo } from "react";
import { useWorkspaceTags } from "@application/hooks/useWorkspaceTags";
import { normalizeTag, isValidTag } from "@domain/tagNormalizer";

export interface TagPickerProps {
  currentTags: string[];
  onAddTag: (tag: string) => void;
  placeholder?: string;
  buttonLabel?: string;
  size?: "small" | "medium";
  className?: string;
}

export const TagPicker: React.FC<TagPickerProps> = ({
  currentTags,
  onAddTag,
  placeholder = "+ Add tag",
  buttonLabel = "+ Add tag",
  size = "medium",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const workspaceTags = useWorkspaceTags();

  // Filter out tags that are already applied to this note/entry
  const availableTags = useMemo(() => {
    const currentSet = new Set(currentTags.map((t) => t.toLowerCase()));
    return workspaceTags.filter((item) => !currentSet.has(item.tag.toLowerCase()));
  }, [workspaceTags, currentTags]);

  const cleanQuery = normalizeTag(searchQuery);

  // Suggestions filtered by cleanQuery
  const matchingTags = useMemo(() => {
    if (!cleanQuery) return availableTags;
    return availableTags.filter((item) =>
      item.tag.toLowerCase().includes(cleanQuery.toLowerCase())
    );
  }, [availableTags, cleanQuery]);

  // Can we create a new tag with the typed query?
  const canCreateNew = useMemo(() => {
    if (!isValidTag(cleanQuery)) return false;
    // Don't show create if it's already in the note or matches an existing workspace tag exactly
    const alreadyOnNote = currentTags.some((t) => t.toLowerCase() === cleanQuery.toLowerCase());
    if (alreadyOnNote) return false;
    const exactMatch = matchingTags.some((t) => t.tag.toLowerCase() === cleanQuery.toLowerCase());
    return !exactMatch;
  }, [cleanQuery, currentTags, matchingTags]);

  // Combined list for keyboard navigation:
  // If canCreateNew, index 0 is "__CREATE__", followed by matchingTags
  const totalOptionsCount = (canCreateNew ? 1 : 0) + matchingTags.length;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [cleanQuery]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelectTag = (tag: string) => {
    const normalized = normalizeTag(tag);
    if (isValidTag(normalized) && !currentTags.includes(normalized)) {
      onAddTag(normalized);
      setSearchQuery("");
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (totalOptionsCount > 0) {
        setHighlightedIndex((prev) => (prev + 1) % totalOptionsCount);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (totalOptionsCount > 0) {
        setHighlightedIndex((prev) => (prev - 1 + totalOptionsCount) % totalOptionsCount);
      }
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (canCreateNew && highlightedIndex === 0) {
        handleSelectTag(cleanQuery);
      } else {
        const itemIdx = canCreateNew ? highlightedIndex - 1 : highlightedIndex;
        if (matchingTags[itemIdx]) {
          handleSelectTag(matchingTags[itemIdx].tag);
        } else if (isValidTag(cleanQuery)) {
          handleSelectTag(cleanQuery);
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
    } else if (e.key === "Tab" && totalOptionsCount > 0) {
      e.preventDefault();
      const itemIdx = canCreateNew ? (highlightedIndex === 0 ? -1 : highlightedIndex - 1) : highlightedIndex;
      if (itemIdx >= 0 && matchingTags[itemIdx]) {
        handleSelectTag(matchingTags[itemIdx].tag);
      } else if (canCreateNew) {
        handleSelectTag(cleanQuery);
      } else if (matchingTags[0]) {
        handleSelectTag(matchingTags[0].tag);
      }
    }
  };

  return (
    <div ref={containerRef} className={`tag-picker-container ${className} size-${size}`}>
      {!isOpen ? (
        <button
          type="button"
          className={`tag-picker-trigger-btn ${size}`}
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 10);
          }}
          title="Select or create a tag"
        >
          <span className="tag-picker-trigger-icon">+</span>
          <span className="tag-picker-trigger-label">{buttonLabel}</span>
        </button>
      ) : (
        <div className="tag-picker-active-wrapper">
          <input
            ref={inputRef}
            type="text"
            className={`tag-picker-input ${size}`}
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />

          {/* Floating Tag Picker Dropdown */}
          <div className="tag-picker-popover" ref={listRef}>
            <div className="tag-picker-popover-header">
              <span>{cleanQuery ? "Filter or Create Tag" : "Select Previously Created Tag"}</span>
              <span className="tag-picker-key-hint">ESC to close</span>
            </div>

            <div className="tag-picker-list">
              {/* Option to create new tag if query typed is not in list */}
              {canCreateNew && (
                <button
                  type="button"
                  className={`tag-picker-item create-new ${highlightedIndex === 0 ? "is-highlighted" : ""}`}
                  onClick={() => handleSelectTag(cleanQuery)}
                  onMouseEnter={() => setHighlightedIndex(0)}
                >
                  <span className="tag-picker-item-label">
                    <span className="tag-plus-icon">+</span> Create <strong>#{cleanQuery}</strong>
                  </span>
                  <span className="tag-picker-item-badge">Enter ↵</span>
                </button>
              )}

              {/* Existing tags matching query */}
              {matchingTags.map((item, idx) => {
                const itemNavigationIndex = canCreateNew ? idx + 1 : idx;
                const isHighlighted = highlightedIndex === itemNavigationIndex;

                return (
                  <button
                    key={item.tag}
                    type="button"
                    className={`tag-picker-item ${isHighlighted ? "is-highlighted" : ""}`}
                    onClick={() => handleSelectTag(item.tag)}
                    onMouseEnter={() => setHighlightedIndex(itemNavigationIndex)}
                  >
                    <span className="tag-picker-item-label">
                      <span className="tag-hash">#</span>
                      {item.tag}
                    </span>
                    <span className="tag-picker-count-badge" title={`Used in ${item.count} notes/entries`}>
                      {item.count}
                    </span>
                  </button>
                );
              })}

              {/* Empty state when no tags exist and nothing typed */}
              {totalOptionsCount === 0 && (
                <div className="tag-picker-empty">
                  {cleanQuery ? (
                    <span>Invalid tag format. Use lowercase letters, numbers, and dashes.</span>
                  ) : (
                    <span>No tags created yet. Type a name to create your first tag!</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
