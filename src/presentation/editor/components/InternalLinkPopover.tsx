import React from "react";

export interface LinkCandidate {
  id: string;
  title: string;
  tags?: string[] | undefined;
  type: "note" | "dsm";
}

interface InternalLinkPopoverProps {
  items: LinkCandidate[];
  selectedIndex: number;
  onSelect: (item: LinkCandidate) => void;
  coords: { top: number; left: number } | null;
}

export const InternalLinkPopover: React.FC<InternalLinkPopoverProps> = ({
  items,
  selectedIndex,
  onSelect,
  coords,
}) => {
  if (!coords || items.length === 0) {
    return null;
  }

  return (
    <div
      className="internal-link-popover"
      style={{
        position: "fixed",
        top: coords.top + 24,
        left: Math.max(16, coords.left),
        zIndex: 9999,
      }}
    >
      <div className="internal-link-popover-header">
        <span>Link Note or DSM Entry</span>
        <span className="popover-shortcut-hint">↑↓ to navigate • ↵ to select</span>
      </div>

      <div className="internal-link-popover-list" role="listbox">
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div
              key={item.id}
              role="option"
              aria-selected={isSelected}
              className={`internal-link-popover-item ${isSelected ? "is-selected" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
              }}
            >
              <span className="item-icon">
                {item.type === "dsm" ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 0 1 4.75 0ZM2.5 7.5v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V7.5H2.5Z" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M0 3.75C0 2.784.784 2 1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25Zm1.75-.25a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25ZM3.5 6a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 3.5 6Zm0 3a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 3.5 9Z" />
                  </svg>
                )}
              </span>

              <div className="item-details">
                <span className="item-title">{item.title}</span>
                {item.tags && item.tags.length > 0 && (
                  <div className="item-tags">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="item-tag-pill">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
