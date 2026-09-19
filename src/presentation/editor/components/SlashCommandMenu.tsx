import React from "react";

export interface SlashCommandItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  selectedIndex: number;
  onSelect: (item: SlashCommandItem) => void;
  coords: { top: number; left: number } | null;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
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
      className="slash-command-menu"
      style={{
        position: "fixed",
        top: coords.top + 24,
        left: Math.max(16, coords.left),
        zIndex: 9999,
      }}
    >
      <div className="slash-menu-header">
        <span>Insert Block</span>
        <span className="popover-shortcut-hint">↑↓ to navigate • ↵ to select</span>
      </div>

      <div className="slash-menu-list" role="listbox">
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div
              key={item.id}
              role="option"
              aria-selected={isSelected}
              className={`slash-menu-item ${isSelected ? "is-selected" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
              }}
            >
              <span className="slash-item-icon">{item.icon}</span>
              <div className="slash-item-details">
                <span className="slash-item-title">{item.title}</span>
                <span className="slash-item-description">{item.description}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
