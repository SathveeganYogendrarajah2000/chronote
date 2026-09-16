import React from "react";

interface TagChipProps {
  tag: string;
  onClick?: (tag: string) => void;
  onRemove?: (tag: string) => void;
  count?: number;
}

export const TagChip: React.FC<TagChipProps> = ({ tag, onClick, onRemove, count }) => {
  return (
    <span
      className="tag-chip"
      onClick={() => onClick?.(tag)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span>#{tag}</span>
      {count !== undefined && <span style={{ opacity: 0.75, fontSize: "10px" }}>({count})</span>}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove tag ${tag}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
          style={{
            marginLeft: 4,
            opacity: 0.7,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          ×
        </button>
      )}
    </span>
  );
};
