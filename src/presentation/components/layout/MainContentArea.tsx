import React from "react";
import { useTabsStore } from "@application/stores/useTabsStore";
import { TagChip } from "../common/TagChip";

export const MainContentArea: React.FC = () => {
  const { tabs, activeTabId } = useTabsStore();
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const isDsm = activeTab?.documentType === "dsm";
  const today = new Date().toISOString().split("T")[0];

  return (
    <main className="content-viewport">
      {isDsm ? (
        <div className="dsm-timeline-container">
          <div style={{ marginBottom: "var(--space-6)" }}>
            <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, marginBottom: "var(--space-1)" }}>
              Daily Stand-up Journal
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-size-sm)" }}>
              One continuous engineering journal. Every calendar date is an independently addressable, taggable entry.
            </p>
          </div>

          {/* Today's Entry Card */}
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-4)",
              marginBottom: "var(--space-4)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "var(--space-3)",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: "var(--space-2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ fontSize: "12px", color: "var(--accent-primary)" }}>▼</span>
                <strong style={{ fontSize: "var(--font-size-md)", fontFamily: "var(--font-mono)" }}>
                  {today}
                </strong>
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--text-muted)",
                    backgroundColor: "var(--bg-app)",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  Today
                </span>
              </div>
              <div style={{ display: "flex", gap: "var(--space-1)" }}>
                <TagChip tag="milestone-1.1" />
                <TagChip tag="scaffolding" />
              </div>
            </div>

            <div
              style={{
                minHeight: 120,
                color: "var(--text-primary)",
                fontSize: "var(--font-size-md)",
                lineHeight: 1.6,
              }}
            >
              <p style={{ marginBottom: "var(--space-2)" }}>
                🚀 <strong>Chronote Shell Initialized</strong>: Tauri 2.x native shell, React 19, TypeScript strict mode, and Clean Layered Architecture.
              </p>
              <div
                style={{
                  backgroundColor: "var(--accent-code-bg)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-3)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-sm)",
                  color: "#93c5fd",
                }}
              >
                // Core stack verified: Tauri 2.x + Rust 1.98.1 + React 19 + Vite 6 + Zustand 5
              </div>
            </div>
          </div>
        </div>
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
