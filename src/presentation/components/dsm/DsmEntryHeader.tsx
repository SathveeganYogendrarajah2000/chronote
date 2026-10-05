import React from "react";
import { TagChip } from "../common/TagChip";
import { TagPicker } from "../common/TagPicker";
import { formatDateLabel } from "@domain/dsm.utils";
import { useDsmStore } from "@application/stores/useDsmStore";

interface DsmEntryHeaderProps {
  date: string;
  tags: string[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onAddTag: (rawTag: string) => void;
  onRemoveTag: (tag: string) => void;
  onDeleteEntry: () => void;
}

export const DsmEntryHeader: React.FC<DsmEntryHeaderProps> = ({
  date,
  tags,
  collapsed,
  onToggleCollapse,
  onAddTag,
  onRemoveTag,
  onDeleteEntry,
}) => {
  const { dayOfWeek, isToday, isYesterday } = formatDateLabel(date);

  return (
    <div
      className="dsm-entry-header"
      onDoubleClick={onToggleCollapse}
    >
      <div
        className="dsm-header-left"
        onClick={onToggleCollapse}
        title={collapsed ? "Click to expand" : "Click to collapse"}
      >
        <button
          type="button"
          className="dsm-chevron-btn"
          aria-label={collapsed ? "Expand entry" : "Collapse entry"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
        >
          {collapsed ? "▶" : "▼"}
        </button>

        <span className="dsm-date-title">
          {date}
          <span className="dsm-day-badge">[{dayOfWeek}]</span>
        </span>

        {isToday && <span className="dsm-relative-pill today">Today</span>}
        {isYesterday && <span className="dsm-relative-pill yesterday">Yesterday</span>}
      </div>

      <div className="dsm-header-right">
        <div className="dsm-tags-container">
          {tags.map((tag) => (
            <TagChip
              key={tag}
              tag={tag}
              onClick={() => {
                useDsmStore.getState().toggleTagFilter(tag);
              }}
              onRemove={() => onRemoveTag(tag)}
            />
          ))}

          <TagPicker
            currentTags={tags}
            onAddTag={onAddTag}
            placeholder="+ tag..."
            buttonLabel="+ Tag"
            size="small"
            className="dsm-tag-picker"
          />
        </div>

        <button
          type="button"
          className="dsm-entry-delete-btn"
          title="Move this date entry to Recycle Bin"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Move stand-up entry for ${date} to Recycle Bin? (Retained for 30 days)`)) {
              onDeleteEntry();
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
