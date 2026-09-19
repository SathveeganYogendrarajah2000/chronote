import React from "react";
import { useTabsStore } from "@application/stores/useTabsStore";
import { TagChip } from "../common/TagChip";
import { DsmTimeline } from "../dsm/DsmTimeline";

export const MainContentArea: React.FC = () => {
  const { tabs, activeTabId } = useTabsStore();
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const isDsm = activeTab?.documentType === "dsm";

  return (
    <main className="content-viewport">
      {isDsm ? (
        <DsmTimeline />
      ) : (
        <div className="note-editor-container">
          <div style={{ marginBottom: "var(--space-4)" }}>
            <input
              type="text"
              value={activeTab?.title || "Untitled Note"}
              readOnly
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                fontSize: "var(--font-size-xl)",
                fontWeight: 700,
                color: "var(--text-primary)",
                outline: "none",
                marginBottom: "var(--space-2)",
              }}
            />
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
              <TagChip tag="engineering" />
              <TagChip tag="architecture" />
            </div>
          </div>

          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-5)",
              minHeight: 300,
            }}
          >
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-size-md)", lineHeight: 1.6 }}>
              This general note is ready for editing. In Milestone 1.5, Tiptap 3.x with Markdown input shortcuts, first-class code blocks, and internal note links will be integrated directly into this canvas.
            </p>
          </div>
        </div>
      )}
    </main>
  );
};
