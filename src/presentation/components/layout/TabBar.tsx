import React from "react";
import { useTabsStore } from "@application/stores/useTabsStore";

export const TabBar: React.FC = () => {
  const { tabs, activeTabId, switchTab, closeTab } = useTabsStore();

  const handleAuxClick = (e: React.MouseEvent, tabId: string, isPinned: boolean) => {
    // Middle click closes unpinned tab
    if (e.button === 1 && !isPinned) {
      e.preventDefault();
      closeTab(tabId);
    }
  };

  return (
    <div className="tab-bar-container" role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`tab-item ${isActive ? "active" : ""}`}
            onClick={() => switchTab(tab.id)}
            onAuxClick={(e) => handleAuxClick(e, tab.id, tab.isPinned)}
          >
            {tab.isPinned && (
              <span style={{ fontSize: "11px", color: "var(--accent-primary)" }}>★</span>
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
    </div>
  );
};
