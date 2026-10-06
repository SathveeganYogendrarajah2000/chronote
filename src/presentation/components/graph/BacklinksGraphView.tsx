import React, { useEffect, useRef, useState, useCallback } from "react";
import { useGraphStore } from "@application/stores/useGraphStore";
import { useTabsStore } from "@application/stores/useTabsStore";
import { DSM_TAB_ID, COURSES_TAB_ID } from "@domain/tabs.types";
import type { SimulationNode, GraphDocType } from "@domain/graph.types";

export const BacklinksGraphView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    visibleNodes,
    visibleEdges,
    hoveredNodeId,
    selectedNodeId,
    connectedNeighborIds,
    isLoading,
    physicsRunning,
    zoom,
    panX,
    panY,
    filters,
    loadGraph,
    stepPhysics,
    setHoveredNode,
    setSelectedNode,
    updateFilters,
    setPhysicsRunning,
    setZoom,
    setPan,
    resetViewport,
    pinNode,
    unpinNode,
  } = useGraphStore();

  const { openTab, switchTab } = useTabsStore();

  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initial graph load
  useEffect(() => {
    const width = containerRef.current?.clientWidth || 900;
    const height = containerRef.current?.clientHeight || 650;
    void loadGraph(width, height);
  }, [loadGraph]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      canvasRef.current.width = w * dpr;
      canvasRef.current.height = h * dpr;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      // Step physics
      if (physicsRunning) {
        stepPhysics(width / 2, height / 2);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Apply Camera (Pan & Zoom)
      ctx.translate(width / 2 + panX, height / 2 + panY);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);

      const hasHighlight = hoveredNodeId !== null || selectedNodeId !== null;
      const activeHighlightId = hoveredNodeId || selectedNodeId;

      // 1. Draw Edges
      visibleEdges.forEach((edge) => {
        const isConnectedToHover =
          activeHighlightId &&
          (edge.sourceId === activeHighlightId || edge.targetId === activeHighlightId);

        ctx.beginPath();
        ctx.moveTo(edge.source.x, edge.source.y);
        ctx.lineTo(edge.target.x, edge.target.y);

        if (isConnectedToHover) {
          ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
          ctx.lineWidth = 2.0;
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 8;
        } else if (hasHighlight) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
          ctx.lineWidth = 1.0;
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
          ctx.lineWidth = 1.2;
          ctx.shadowBlur = 0;
        }

        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      });

      // 2. Draw Nodes
      visibleNodes.forEach((node) => {
        const isCurrentHover = node.id === activeHighlightId;
        const isConnectedNeighbor = connectedNeighborIds.has(node.id);
        const isDimmed = hasHighlight && !isCurrentHover && !isConnectedNeighbor;

        const baseColor =
          node.docType === "dsm"
            ? "#10b981"
            : node.docType === "courses"
            ? "#f59e0b"
            : "#38bdf8";

        // Outer glow on hovered/selected
        if (isCurrentHover) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = `${baseColor}33`; // 20% alpha
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
          ctx.fillStyle = `${baseColor}66`;
          ctx.fill();
        }

        // Main node body
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = isDimmed ? "rgba(40, 50, 65, 0.35)" : baseColor;
        ctx.fill();

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isDimmed
          ? "rgba(255, 255, 255, 0.1)"
          : isCurrentHover
          ? "#ffffff"
          : "rgba(255, 255, 255, 0.6)";
        ctx.stroke();

        // Node Label
        ctx.font = isCurrentHover
          ? "600 12px Inter, sans-serif"
          : "500 11px Inter, sans-serif";
        ctx.fillStyle = isDimmed
          ? "rgba(150, 160, 175, 0.25)"
          : isCurrentHover
          ? "#ffffff"
          : "rgba(240, 246, 252, 0.85)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const truncatedTitle =
          node.title.length > 22 ? `${node.title.slice(0, 20)}…` : node.title;
        ctx.fillText(truncatedTitle, node.x, node.y + node.radius + 4);
      });

      ctx.restore();
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [
    visibleNodes,
    visibleEdges,
    hoveredNodeId,
    selectedNodeId,
    connectedNeighborIds,
    physicsRunning,
    zoom,
    panX,
    panY,
    stepPhysics,
  ]);

  // Coordinate conversion: Screen space -> World space
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;

      // Invert Camera Transform
      const x = (screenX - (width / 2 + panX)) / zoom + width / 2;
      const y = (screenY - (height / 2 + panY)) / zoom + height / 2;
      return { x, y };
    },
    [zoom, panX, panY]
  );

  // Find node under pointer
  const findNodeAt = useCallback(
    (worldX: number, worldY: number): SimulationNode | null => {
      for (let i = visibleNodes.length - 1; i >= 0; i--) {
        const n = visibleNodes[i]!;
        const dx = n.x - worldX;
        const dy = n.y - worldY;
        const distSq = dx * dx + dy * dy;
        const hitRadius = Math.max(n.radius + 4, 14);
        if (distSq <= hitRadius * hitRadius) {
          return n;
        }
      }
      return null;
    },
    [visibleNodes]
  );

  // Pointer event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    const hit = findNodeAt(x, y);

    if (hit) {
      setIsDraggingNode(true);
      setDraggedNodeId(hit.id);
      setSelectedNode(hit.id);
      pinNode(hit.id, x, y);
    } else {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);

    if (isDraggingNode && draggedNodeId) {
      pinNode(draggedNodeId, x, y);
    } else if (isPanning) {
      setPan(e.clientX - panStart.x, e.clientY - panStart.y);
    } else {
      const hit = findNodeAt(x, y);
      setHoveredNode(hit ? hit.id : null);
    }
  };

  const handleMouseUp = () => {
    if (isDraggingNode && draggedNodeId) {
      unpinNode(draggedNodeId);
      setIsDraggingNode(false);
      setDraggedNodeId(null);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.88;
    setZoom(zoom * factor);
  };

  // Click to open selected node in note editor
  const handleOpenNote = (node: SimulationNode) => {
    if (node.docType === "dsm") {
      switchTab(DSM_TAB_ID);
    } else if (node.docType === "courses") {
      switchTab(COURSES_TAB_ID);
    } else {
      openTab({
        documentId: node.id,
        documentType: "general",
        title: node.title,
      });
    }
  };

  const selectedNode = visibleNodes.find((n) => n.id === selectedNodeId);

  const toggleDocTypeFilter = (type: GraphDocType) => {
    const current = new Set(filters.selectedDocTypes);
    if (current.has(type)) {
      if (current.size > 1) current.delete(type);
    } else {
      current.add(type);
    }
    updateFilters({ selectedDocTypes: Array.from(current) });
  };

  return (
    <div className="graph-view-container" ref={containerRef}>
      {/* Top Floating HUD Toolbar */}
      <div className="graph-toolbar">
        <div className="graph-filter-bar">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.6 }}>
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
          </svg>
          <input
            type="text"
            className="graph-search-input"
            placeholder="Search graph..."
            value={filters.searchQuery}
            onChange={(e) => updateFilters({ searchQuery: e.target.value })}
          />

          <button
            type="button"
            className={`graph-type-btn ${filters.selectedDocTypes.includes("general") ? "active" : ""}`}
            onClick={() => toggleDocTypeFilter("general")}
          >
            Notes
          </button>
          <button
            type="button"
            className={`graph-type-btn dsm ${filters.selectedDocTypes.includes("dsm") ? "active" : ""}`}
            onClick={() => toggleDocTypeFilter("dsm")}
          >
            DSM
          </button>
          <button
            type="button"
            className={`graph-type-btn courses ${filters.selectedDocTypes.includes("courses") ? "active" : ""}`}
            onClick={() => toggleDocTypeFilter("courses")}
          >
            Courses
          </button>
        </div>

        {/* Viewport & Physics Controls */}
        <div className="graph-controls-cluster">
          <span className="graph-stats-badge">
            {visibleNodes.length} Notes • {visibleEdges.length} Links
          </span>

          <button
            type="button"
            className="graph-control-btn"
            onClick={() => setZoom(zoom * 1.2)}
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            className="graph-control-btn"
            onClick={() => setZoom(zoom * 0.8)}
            title="Zoom Out"
          >
            -
          </button>
          <button
            type="button"
            className="graph-control-btn"
            onClick={resetViewport}
            title="Reset View"
          >
            ⊙
          </button>
          <button
            type="button"
            className="graph-control-btn"
            onClick={() => setPhysicsRunning(!physicsRunning)}
            title={physicsRunning ? "Pause Physics Simulation" : "Resume Physics Simulation"}
          >
            {physicsRunning ? "⏸" : "▶"}
          </button>
        </div>
      </div>

      {/* Main Graph Canvas */}
      <canvas
        ref={canvasRef}
        className="graph-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Selected Node Details Flyout */}
      {selectedNode && (
        <div className="graph-node-flyout">
          <div className="graph-flyout-header">
            <div className="graph-flyout-title">{selectedNode.title}</div>
            <button
              type="button"
              className="perf-modal-close"
              style={{ width: 18, height: 18 }}
              onClick={() => setSelectedNode(null)}
            >
              ×
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className={`graph-flyout-badge ${selectedNode.docType}`}>
              {selectedNode.docType === "dsm"
                ? "Daily Stand-up"
                : selectedNode.docType === "courses"
                ? "Course & Learning"
                : "General Note"}
            </span>
          </div>

          <div className="graph-flyout-metrics">
            <span>
              Incoming: <span className="graph-flyout-metric-val">{selectedNode.inDegree}</span>
            </span>
            <span>
              Outgoing: <span className="graph-flyout-metric-val">{selectedNode.outDegree}</span>
            </span>
          </div>

          {selectedNode.tags.length > 0 && (
            <div className="graph-flyout-tags">
              {selectedNode.tags.map((t) => (
                <span key={t} className="graph-flyout-tag">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <button
            type="button"
            className="graph-flyout-action"
            onClick={() => handleOpenNote(selectedNode)}
          >
            Open in Editor ↗
          </button>
        </div>
      )}

      {isLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(9, 13, 22, 0.7)",
            color: "var(--text-secondary)",
            fontSize: "13px",
          }}
        >
          Loading Backlinks Graph...
        </div>
      )}
    </div>
  );
};
