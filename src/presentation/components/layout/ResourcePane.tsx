import React, { useEffect, useMemo, useState } from "react";
import { useUiStore } from "@application/stores/useUiStore";
import { useResourceStore } from "@application/stores/useResourceStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { useNotesStore } from "@application/stores/useNotesStore";
import { useDsmStore } from "@application/stores/useDsmStore";
import { DSM_TAB_ID } from "@domain/tabs.types";
import type { ResourceType, ResourceReference, BacklinkReference } from "@domain/resource.types";
import { IconButton } from "../common/IconButton";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";
import { toAssetUrl } from "@infrastructure/tauri/assetHelper";
import { TableOfContents } from "../toc/TableOfContents";
import { extractHeadings } from "@domain/toc.utils";
import { useTocStore } from "@application/stores/useTocStore";
import { useCoursesStore } from "@application/stores/useCoursesStore";

export const ResourcePane: React.FC = () => {
  const {
    resourcePaneCollapsed,
    toggleResourcePane,
    resourcePaneWidth,
    setResourcePaneWidth,
    resetResourcePaneWidth,
    setIsResizingSidebar,
  } = useUiStore();
  const [isResizing, setIsResizing] = useState(false);
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

  const noteUpdatedAt = useNotesStore((s) => s.activeNote?.updatedAt);
  const dsmUpdatedAt = useDsmStore((s) => s.dsmDoc?.updatedAt);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active document ID
  const activeDocumentId = useMemo(() => {
    const current = tabs.find((t) => t.id === activeTabId);
    if (!current) return "dsm_master";
    return current.documentType === "dsm" ? "dsm_master" : current.documentId;
  }, [activeTabId, tabs]);

  const activeTabTitle = useMemo(() => {
    const current = tabs.find((t) => t.id === activeTabId);
    return current?.title || "Note";
  }, [activeTabId, tabs]);

  // Refresh resources when active tab, scope, or document updates
  useEffect(() => {
    void refresh(activeDocumentId);
  }, [activeDocumentId, noteUpdatedAt, dsmUpdatedAt, refresh]);

  // Navigate to block, position cursor, and trigger pulse animation
  const handleJumpToResource = (item: ResourceReference) => {
    if (item.parentDocumentType === "dsm") {
      switchTab(DSM_TAB_ID);
      if (item.entryDate) {
        jumpToDate(item.entryDate);
      }
    } else {
      openTab({
        id: `tab_${item.parentDocumentId}`,
        documentId: item.parentDocumentId,
        documentType: "general",
        title: item.title || "Note",
      });
      void loadNote(item.parentDocumentId);
    }

    useResourceStore.getState().scrollToResource(item);
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
    void ipcBridge.openExternalUrl(url);
  };

  const handleRevealInExplorer = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    void ipcBridge.revealInExplorer(path);
  };

  const handleInsertImage = async () => {
    const asset = await ipcBridge.pickAssetFile("image");
    if (!asset) return;
    const current = tabs.find((t) => t.id === activeTabId);
    if (current?.documentType === "general") {
      const note = useNotesStore.getState().activeNote;
      if (note) {
        const rawPath = asset.absolutePath || asset.relativePath;
        const src = toAssetUrl(rawPath);
        const newBlock = {
          type: "image",
          attrs: {
            src,
            filePath: rawPath,
            alt: asset.fileName,
            assetId: asset.id,
            title: asset.fileName,
          },
        };
        const currentBlocks = (note.content.content as any[]) || [];
        useNotesStore.getState().updateContent({
          ...note.content,
          content: [...currentBlocks, newBlock],
        });
      }
    }
    void refresh(activeDocumentId);
  };

  const handleAttachFile = async () => {
    const asset = await ipcBridge.pickAssetFile("file");
    if (!asset) return;
    const current = tabs.find((t) => t.id === activeTabId);
    if (current?.documentType === "general") {
      const note = useNotesStore.getState().activeNote;
      if (note) {
        const rawPath = asset.absolutePath || asset.relativePath;
        const src = toAssetUrl(rawPath);
        const newBlock = {
          type: "attachment",
          attrs: {
            src,
            filePath: rawPath,
            fileName: asset.fileName,
            fileSize: asset.fileSize,
            mimeType: asset.mimeType,
            assetId: asset.id,
          },
        };
        const currentBlocks = (note.content.content as any[]) || [];
        useNotesStore.getState().updateContent({
          ...note.content,
          content: [...currentBlocks, newBlock],
        });
      }
    }
    void refresh(activeDocumentId);
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
    return resources.filter(
      (r) =>
        r.resourceType === "attachment" &&
        (!cleanFilter ||
          r.title.toLowerCase().includes(cleanFilter) ||
          r.targetUrl?.toLowerCase().includes(cleanFilter))
    );
  }, [resources, cleanFilter]);

  const filteredBacklinks = useMemo(() => {
    return backlinks.filter(
      (b) =>
        !cleanFilter ||
        b.sourceDocumentTitle.toLowerCase().includes(cleanFilter) ||
        b.sourceEntryDate?.includes(cleanFilter)
    );
  }, [backlinks, cleanFilter]);

  const currentTab = tabs.find((t) => t.id === activeTabId);
  const isDsmDoc = currentTab?.documentType === "dsm";
  const isCoursesDoc = currentTab?.documentType === "courses";
  const activeNote = useNotesStore((s) => s.activeNote);
  const dsmDoc = useDsmStore((s) => s.dsmDoc);
  const highlightedDate = useDsmStore((s) => s.highlightedDate);
  const activeContext = useTocStore((s) => s.activeContext);
  const coursesDoc = useCoursesStore((s) => s.coursesDoc);
  const selectedTopicId = useCoursesStore((s) => s.selectedTopicId);

  const tocHeadingsCount = useMemo(() => {
    if (isDsmDoc) {
      const activeDate = activeContext?.date || highlightedDate || dsmDoc?.entries[0]?.date;
      const entry = activeDate ? dsmDoc?.entries.find((e) => e.date === activeDate) : null;
      return entry ? extractHeadings(entry.content).length : 0;
    } else if (isCoursesDoc) {
      const activeTopic = selectedTopicId && coursesDoc ? coursesDoc.topics.find((t) => t.id === selectedTopicId) : null;
      return activeTopic && activeTopic.content ? extractHeadings(activeTopic.content).length : 0;
    } else {
      return activeNote ? extractHeadings(activeNote.content).length : 0;
    }
  }, [isDsmDoc, isCoursesDoc, activeContext?.date, highlightedDate, dsmDoc?.entries, selectedTopicId, coursesDoc, activeNote]);

  const tabDefs: { id: ResourceType; label: string; count: number }[] = [
    { id: "outline", label: "Outline", count: tocHeadingsCount },
    { id: "code", label: "Code", count: codeItems.length },
    { id: "image", label: "Images", count: imageItems.length },
    { id: "link", label: "Links", count: linkItems.length },
    { id: "attachment", label: "Files", count: attachmentItems.length },
    { id: "backlink", label: "Backlinks", count: filteredBacklinks.length },
  ];

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setIsResizingSidebar(true);
    document.body.classList.add("is-resizing-sidebar");

    const startX = e.clientX;
    const startWidth = resourcePaneWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const zoom = useUiStore.getState().zoomLevel;
      // Dragging left increases width, dragging right decreases width
      const delta = (startX - moveEvent.clientX) / zoom;
      setResourcePaneWidth(startWidth + delta);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setIsResizingSidebar(false);
      document.body.classList.remove("is-resizing-sidebar");
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <aside
      className={`resource-pane ${resourcePaneCollapsed ? "collapsed" : ""} ${isResizing ? "resizing" : ""}`}
      style={{
        width: resourcePaneCollapsed ? 0 : resourcePaneWidth,
        minWidth: resourcePaneCollapsed ? 0 : resourcePaneWidth,
      }}
    >
      {!resourcePaneCollapsed && (
        <div
          className={`resource-pane-resize-handle ${isResizing ? "resizing" : ""}`}
          onMouseDown={handleMouseDownResize}
          onDoubleClick={resetResourcePaneWidth}
          title="Drag to resize inspector (Double-click to reset width)"
        />
      )}
      <div className="resource-scrollable-content">
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
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button
            type="button"
            className="icon-button"
            onClick={() => void refresh(activeDocumentId)}
            title="Refresh Resources"
            style={{
              fontSize: "12px",
              padding: "2px 5px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            🔄
          </button>
          <IconButton
            label="Collapse Resource Pane"
            icon={<span>×</span>}
            onClick={toggleResourcePane}
          />
        </div>
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

        {/* Outline Tab (Table of Contents) */}
        {!isLoading && activeTab === "outline" && (
          <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <TableOfContents />
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
            <button
              type="button"
              className="btn-secondary"
              onClick={handleInsertImage}
              style={{
                fontSize: "var(--font-size-xs)",
                padding: "4px 8px",
                alignSelf: "flex-start",
                marginBottom: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
              title="Upload or insert image from computer"
            >
              <span>+ Insert Image</span>
            </button>
            {imageItems.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)", textAlign: "center", padding: "var(--space-4) 0" }}>
                No embedded images found. Drag & drop or paste an image into any note.
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
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAttachFile}
              style={{
                fontSize: "var(--font-size-xs)",
                padding: "4px 8px",
                alignSelf: "flex-start",
                marginBottom: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
              title="Attach a file to this note"
            >
              <span>+ Attach File</span>
            </button>
            {attachmentItems.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)", textAlign: "center", padding: "var(--space-4) 0" }}>
                No attached files in this document. Click "+ Attach File" or drag & drop files from your desktop.
              </div>
            ) : (
              attachmentItems.map((item) => (
                <div
                  key={item.id}
                  className="resource-card"
                  onClick={() => handleJumpToResource(item)}
                  title="Click to jump to file in note"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                      <span style={{ fontSize: "16px" }}>📎</span>
                      <span className="resource-title-text">{item.title}</span>
                    </div>
                    {item.targetUrl && (
                      <button
                        type="button"
                        className="resource-copy-btn"
                        onClick={(e) => handleRevealInExplorer(e, item.targetUrl || "")}
                        title="Reveal file in File Explorer"
                      >
                        Folder ↗
                      </button>
                    )}
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

        {/* Backlinks Tab */}
        {!isLoading && activeTab === "backlink" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <div
              style={{
                padding: "6px 8px",
                backgroundColor: "rgba(59, 130, 246, 0.08)",
                borderRadius: "var(--radius-sm)",
                fontSize: "11px",
                color: "var(--text-secondary)",
                lineHeight: 1.4,
              }}
            >
              💡 <strong>Backlinks</strong> show all notes and daily stand-ups that reference this document via <code>[[Note Title]]</code>.
            </div>
            {filteredBacklinks.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)", textAlign: "center", padding: "var(--space-4) var(--space-2)", lineHeight: 1.5 }}>
                No incoming backlinks to this document. Link to it from any note using <code>[[{activeTabTitle}]]</code>.
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
      </div>
    </aside>
  );
};
