import React, { useEffect, useMemo, useState } from "react";
import { useUiStore } from "@application/stores/useUiStore";
import { useResourceStore } from "@application/stores/useResourceStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useNotesStore } from "@application/stores/useNotesStore";
import { useDsmStore } from "@application/stores/useDsmStore";
import { DSM_TAB_ID } from "@domain/tabs.types";
import type { ResourceType, ResourceReference, BacklinkReference } from "@domain/resource.types";
import { IconButton } from "../common/IconButton";

export const ResourcePane: React.FC = () => {
  const { resourcePaneCollapsed, toggleResourcePane } = useUiStore();
  const {
    activeTab,
    scope,
    filterQuery,
    resources,
    backlinks,
    isLoading,
    setActiveTab,
    setScope,
    setFilterQuery,
    refresh,
  } = useResourceStore();

  const { activeTabId, tabs, openTab, switchTab } = useTabsStore();
  const { loadNote } = useNotesStore();
  const { jumpToDate } = useDsmStore();

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active document ID
  const activeDocumentId = useMemo(() => {
    const current = tabs.find((t) => t.id === activeTabId);
    if (!current) return "dsm_master";
    return current.documentType === "dsm" ? "dsm_master" : current.documentId;
  }, [activeTabId, tabs]);

  // Refresh resources when active tab changes or scope changes
  useEffect(() => {
    void refresh(activeDocumentId);
  }, [activeDocumentId, refresh]);

  // Navigate to block and trigger pulse animation
  const handleJumpToResource = (item: ResourceReference) => {
    if (item.parentDocumentType === "dsm") {
      switchTab(DSM_TAB_ID);
      if (item.entryDate) {
        jumpToDate(item.entryDate);
      }
    } else {
      openTab({
        documentId: item.parentDocumentId,
        documentType: "general",
        title: item.title || "Note",
      });
      void loadNote(item.parentDocumentId);
    }

    if (typeof document !== "undefined" && item.blockId) {
      setTimeout(() => {
        const el =
          document.querySelector(`[data-block-id="${item.blockId}"]`) ||
          document.getElementById(item.blockId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.remove("block-highlight-pulse");
          void (el as HTMLElement).offsetWidth;
          el.classList.add("block-highlight-pulse");
          setTimeout(() => el.classList.remove("block-highlight-pulse"), 2600);
        }
      }, 120);
    }
  };

  const handleJumpToBacklink = (bkl: BacklinkReference) => {
    if (bkl.sourceDocumentType === "dsm") {
      switchTab(DSM_TAB_ID);
      if (bkl.sourceEntryDate) {
        jumpToDate(bkl.sourceEntryDate);
      }
    } else {
      openTab({
        documentId: bkl.sourceDocumentId,
        documentType: "general",
        title: bkl.sourceDocumentTitle,
      });
      void loadNote(bkl.sourceDocumentId);
    }
  };

  const handleCopySnippet = (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const handleOpenExternalUrl = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Filter items
  const cleanFilter = filterQuery.trim().toLowerCase();

  const codeItems = useMemo(() => {
    return resources.filter(
      (r) =>
        r.resourceType === "code" &&
        (!cleanFilter ||
          r.title.toLowerCase().includes(cleanFilter) ||
          r.language?.toLowerCase().includes(cleanFilter) ||
          r.snippet?.toLowerCase().includes(cleanFilter))
    );
  }, [resources, cleanFilter]);

  const imageItems = useMemo(() => {
    return resources.filter(
      (r) =>
        r.resourceType === "image" &&
        (!cleanFilter ||
          r.title.toLowerCase().includes(cleanFilter) ||
          r.targetUrl?.toLowerCase().includes(cleanFilter))
    );
  }, [resources, cleanFilter]);

  const linkItems = useMemo(() => {
    return resources.filter(
      (r) =>
        r.resourceType === "link" &&
        (!cleanFilter ||
          r.title.toLowerCase().includes(cleanFilter) ||
          r.targetUrl?.toLowerCase().includes(cleanFilter))
    );
  }, [resources, cleanFilter]);

  const attachmentItems = useMemo(() => {
    return resources.filter((r) => r.resourceType === "attachment");
  }, [resources]);

  const filteredBacklinks = useMemo(() => {
    return backlinks.filter(
      (b) =>
        !cleanFilter ||
        b.sourceDocumentTitle.toLowerCase().includes(cleanFilter) ||
        b.sourceEntryDate?.includes(cleanFilter)
    );
  }, [backlinks, cleanFilter]);

  const tabDefs: { id: ResourceType; label: string; count: number }[] = [
    { id: "code", label: "Code", count: codeItems.length },
    { id: "image", label: "Images", count: imageItems.length },
    { id: "link", label: "Links", count: linkItems.length },
    { id: "attachment", label: "Files", count: attachmentItems.length },
    { id: "backlink", label: "Backlinks", count: filteredBacklinks.length },
  ];

  return (
    <aside className={`resource-pane ${resourcePaneCollapsed ? "collapsed" : ""}`}>
      {/* Header */}
      <div className="resource-header">
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Resource Inspector
        </span>
        <IconButton
          label="Collapse Resource Pane"
          icon={<span>×</span>}
          onClick={toggleResourcePane}
        />
      </div>

      {/* Scope Switcher */}
      <div style={{ display: "flex", padding: "6px var(--space-3)", gap: 4, backgroundColor: "var(--bg-app)", borderBottom: "1px solid var(--border-subtle)" }}>
        <button
          type="button"
          className={`resource-scope-btn ${scope === "activeDoc" ? "active" : ""}`}
          onClick={() => setScope("activeDoc", activeDocumentId)}
        >
          This Note
        </button>
        <button
          type="button"
          className={`resource-scope-btn ${scope === "workspace" ? "active" : ""}`}
          onClick={() => setScope("workspace", activeDocumentId)}
        >
          All Notes
        </button>
      </div>

      {/* Inline Search / Filter */}
      <div style={{ padding: "6px var(--space-3)", borderBottom: "1px solid var(--border-subtle)" }}>
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter resources..."
          style={{
            width: "100%",
            fontSize: "var(--font-size-xs)",
            padding: "4px 8px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
      </div>

      {/* Resource Tabs */}
      <div className="resource-tabs">
        {tabDefs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`resource-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count > 0 && <span className="resource-count-badge">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Resource List Content */}
      <div className="resource-list-content">
        {isLoading && (
          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "var(--font-size-xs)", padding: "var(--space-4)" }}>
            Loading resources...
          </div>
        )}

        {/* Code Tab */}
        {!isLoading && activeTab === "code" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {codeItems.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)", textAlign: "center", padding: "var(--space-4) 0" }}>
                No code blocks found.
              </div>
            ) : (
              codeItems.map((item) => (
                <div
                  key={item.id}
                  className="resource-card"
                  onClick={() => handleJumpToResource(item)}
                  title="Click to jump to code block"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span className="resource-lang-pill">{item.language || "text"}</span>
                    <button
                      type="button"
                      className="resource-copy-btn"
                      onClick={(e) => handleCopySnippet(e, item.id, item.snippet || item.title)}
                      title="Copy code snippet"
                    >
                      {copiedId === item.id ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="resource-title-text" style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                    {item.title}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Images Tab */}
        {!isLoading && activeTab === "image" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {imageItems.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)", textAlign: "center", padding: "var(--space-4) 0" }}>
                No embedded images found.
              </div>
            ) : (
              imageItems.map((item) => (
                <div
                  key={item.id}
                  className="resource-card"
                  onClick={() => handleJumpToResource(item)}
                  title="Click to jump to image"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "16px" }}>🖼️</span>
                    <span className="resource-title-text">{item.title}</span>
                  </div>
                  {item.targetUrl && (
                    <div style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.targetUrl}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Links Tab */}
        {!isLoading && activeTab === "link" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {linkItems.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)", textAlign: "center", padding: "var(--space-4) 0" }}>
                No external links found.
              </div>
            ) : (
              linkItems.map((item) => (
                <div
                  key={item.id}
                  className="resource-card"
                  onClick={() => handleJumpToResource(item)}
                  title="Click to jump to link in editor"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                    <div className="resource-title-text" style={{ color: "var(--accent-hover)" }}>
                      🔗 {item.title}
                    </div>
                    {item.targetUrl && (
                      <button
                        type="button"
                        className="resource-copy-btn"
                        onClick={(e) => handleOpenExternalUrl(e, item.targetUrl || "")}
                        title="Open in external browser"
                      >
                        ↗
                      </button>
                    )}
                  </div>
                  {item.targetUrl && (
                    <div style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.targetUrl}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Attachments Tab */}
        {!isLoading && activeTab === "attachment" && (
          <div style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)", textAlign: "center", padding: "var(--space-4) 0" }}>
            No attached files in this document.
          </div>
        )}

        {/* Backlinks Tab */}
        {!isLoading && activeTab === "backlink" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {filteredBacklinks.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)", textAlign: "center", padding: "var(--space-4) 0" }}>
                No incoming backlinks to this document.
              </div>
            ) : (
              filteredBacklinks.map((bkl, idx) => (
                <div
                  key={`${bkl.sourceDocumentId}_${idx}`}
                  className="resource-card"
                  onClick={() => handleJumpToBacklink(bkl)}
                  title="Click to open referencing note"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: bkl.sourceDocumentType === "dsm" ? "#93c5fd" : "#a7f3d0" }}>
                      {bkl.sourceDocumentType === "dsm" ? "DSM" : "NOTE"}
                    </span>
                    <span className="resource-title-text">{bkl.sourceDocumentTitle}</span>
                  </div>
                  {bkl.sourceEntryDate && (
                    <div style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: 2 }}>
                      📅 {bkl.sourceEntryDate}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
