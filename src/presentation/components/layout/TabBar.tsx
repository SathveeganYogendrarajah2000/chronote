import React, { useState } from "react";
import type { TabItem } from "@domain/tabs.types";
import { useTabsStore } from "@application/stores/useTabsStore";
import { TabContextMenu } from "./TabContextMenu";
import { navigateToNoteOrDsm } from "@application/navigationHelper";

export const TabBar: React.FC = () => {
  const { tabs, activeTabId, switchTab, closeTab } = useTabsStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextMenuState, setContextMenuState] = useState<{
    tab: TabItem;
    x: number;
    y: number;
  } | null>(null);

  const handleAuxClick = (e: React.MouseEvent, tabId: string, isPinned: boolean) => {
    // Middle click closes unpinned tab
    if (e.button === 1 && !isPinned) {
      e.preventDefault();
      closeTab(tabId);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, tab: TabItem) => {
    e.preventDefault();
    setContextMenuState({
      tab,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes("application/x-chronote-note")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!isDragOver) setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragOver(false);
    const rawNoteData = e.dataTransfer.getData("application/x-chronote-note");
    if (rawNoteData) {
      try {
        const { id } = JSON.parse(rawNoteData);
        if (id) {
          e.preventDefault();
          void navigateToNoteOrDsm(id);
        }
      } catch (err) {
        console.error("Failed to open dropped note in tab bar:", err);
      }
    }
  };

  return (
    <div
      className={`tab-bar-container ${isDragOver ? "is-drag-over" : ""}`}
      role="tablist"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isDsm = tab.documentType === "dsm";
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`tab-item ${isActive ? "active" : ""}`}
            onClick={() => switchTab(tab.id)}
            onAuxClick={(e) => handleAuxClick(e, tab.id, tab.isPinned)}
            onContextMenu={(e) => handleContextMenu(e, tab)}
          >
            {tab.isPinned && (
              <span
                style={{
                  fontSize: isDsm ? "11px" : "10px",
                  color: "var(--accent-primary)",
                  marginRight: 2,
                }}
                title={isDsm ? "Pinned Journal" : "Pinned Note Tab"}
              >
                {isDsm ? "★" : "📌"}
              </span>
            )}
            <span className="tab-title" title={tab.title}>
              {tab.title}
            </span>
            {!tab.isPinned && (
              <button
                type="button"
                className="tab-close-btn"
                title="Close Tab (Ctrl+W)"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      {contextMenuState && (
        <TabContextMenu
          tab={contextMenuState.tab}
          x={contextMenuState.x}
          y={contextMenuState.y}
          onClose={() => setContextMenuState(null)}
        />
      )}
    </div>
  );
};
