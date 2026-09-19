import React, { useEffect, useRef } from "react";
import type { TabItem } from "@domain/tabs.types";
import { DSM_TAB_ID } from "@domain/tabs.types";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useNotesStore } from "@application/stores/useNotesStore";

export interface TabContextMenuProps {
  tab: TabItem;
  x: number;
  y: number;
  onClose: () => void;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({ tab, x, y, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { closeTab, closeOtherTabs, closeTabsToTheRight, pinTab, unpinTab } = useTabsStore();
  const { togglePin } = useNotesStore();

  const isDsm = tab.id === DSM_TAB_ID || tab.documentType === "dsm";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleTogglePin = async () => {
    if (isDsm) return;
    if (tab.isPinned) {
      unpinTab(tab.id);
    } else {
      pinTab(tab.id);
    }
    // Synchronize note pinned state on disk as well
    if (tab.documentType === "general") {
      await togglePin(tab.documentId);
    }
    onClose();
  };

  const handleClose = () => {
    if (tab.isPinned) return;
    closeTab(tab.id);
    onClose();
  };

  const handleCloseOthers = () => {
    closeOtherTabs(tab.id);
    onClose();
  };

  const handleCloseRight = () => {
    closeTabsToTheRight(tab.id);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="tab-context-menu"
      style={{ left: Math.min(x, window.innerWidth - 190), top: y }}
    >
      <button
        type="button"
        className="tab-context-menu-item"
        onClick={handleTogglePin}
        disabled={isDsm}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
          <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z" />
        </svg>
        <span>{tab.isPinned ? "Unpin Tab" : "Pin Tab"}</span>
      </button>

      <div className="tab-context-menu-separator" />

      <button
        type="button"
        className="tab-context-menu-item"
        onClick={handleClose}
        disabled={tab.isPinned}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
        </svg>
        <span>Close Tab</span>
      </button>

      <button
        type="button"
        className="tab-context-menu-item"
        onClick={handleCloseOthers}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1 2a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2zm12 1H3v10h10V3z" />
        </svg>
        <span>Close Other Tabs</span>
      </button>

      <button
        type="button"
        className="tab-context-menu-item"
        onClick={handleCloseRight}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
          <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
        </svg>
        <span>Close Tabs to the Right</span>
      </button>
    </div>
  );
};
