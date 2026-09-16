import React from "react";
import { useUiStore, type ResourceTabType } from "@application/stores/useUiStore";
import { IconButton } from "../common/IconButton";

export const ResourcePane: React.FC = () => {
  const {
    resourcePaneCollapsed,
    toggleResourcePane,
    activeResourceTab,
    setActiveResourceTab,
  } = useUiStore();

  const tabs: { id: ResourceTabType; label: string }[] = [
    { id: "code", label: "Code" },
    { id: "images", label: "Images" },
    { id: "links", label: "Links" },
    { id: "attachments", label: "Files" },
    { id: "backlinks", label: "Links Back" },
  ];

  const sampleResources = {
    code: [
      { id: "blk_1", lang: "Rust", title: "Atomic File Persistence Protocol" },
      { id: "blk_2", lang: "TypeScript", title: "Zod Domain Invariant Schemas" },
      { id: "blk_3", lang: "SQL", title: "SQLite FTS5 Full-Text Virtual Table" },
    ],
    images: [
      { id: "img_1", title: "Chronote Layered Architecture Diagram" },
    ],
    links: [
      { id: "lnk_1", title: "Tauri 2.x Documentation", url: "https://v2.tauri.app" },
      { id: "lnk_2", title: "React 19 Release Notes", url: "https://react.dev" },
    ],
    attachments: [],
    backlinks: [
      { id: "bkl_1", title: "Engineering Roadmap", source: "Phase 1 MVP" },
    ],
  };

  return (
    <aside className={`resource-pane ${resourcePaneCollapsed ? "collapsed" : ""}`}>
      <div className="resource-header">
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Resource Inspector
        </span>
        <IconButton
          label="Collapse Resource Pane"
          icon={<span>×</span>}
          onClick={toggleResourcePane}
        />
      </div>

      <div className="resource-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`resource-tab-btn ${activeResourceTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveResourceTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="resource-list-content">
        {activeResourceTab === "code" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {sampleResources.code.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-2) var(--space-3)",
                  fontSize: "var(--font-size-xs)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "var(--accent-tag-text)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                    {item.lang}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>{item.id}</span>
                </div>
                <div style={{ color: "var(--text-secondary)" }}>{item.title}</div>
              </div>
            ))}
          </div>
        )}

        {activeResourceTab === "images" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {sampleResources.images.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-2) var(--space-3)",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-secondary)",
                }}
              >
                🖼️ {item.title}
              </div>
            ))}
          </div>
        )}

        {activeResourceTab === "links" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {sampleResources.links.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-2) var(--space-3)",
                  fontSize: "var(--font-size-xs)",
                }}
              >
                <div style={{ color: "var(--accent-primary)", fontWeight: 500 }}>🔗 {item.title}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: 2 }}>{item.url}</div>
              </div>
            ))}
          </div>
        )}

        {activeResourceTab === "attachments" && (
          <div style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)", textAlign: "center", padding: "var(--space-4) 0" }}>
            No attached files in this document.
          </div>
        )}

        {activeResourceTab === "backlinks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {sampleResources.backlinks.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-2) var(--space-3)",
                  fontSize: "var(--font-size-xs)",
                }}
              >
                <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{item.title}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>Referenced from: {item.source}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
