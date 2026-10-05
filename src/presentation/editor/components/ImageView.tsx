import React, { useState, useRef, useEffect } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { toAssetUrl } from "@infrastructure/tauri/assetHelper";
import { useUiStore } from "@application/stores/useUiStore";

type ResizeHandleType = "right" | "left" | "corner-br" | "corner-bl";

export const ImageView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  selected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const rawWidth = node.attrs.width as string | number | undefined;
  const alignment = (node.attrs.align as "left" | "center" | "right") || "center";
  const alt = (node.attrs.alt as string) || "";
  const title = (node.attrs.title as string) || "";
  const src = (node.attrs.src as string) || (node.attrs.filePath as string) || "";

  const [isResizing, setIsResizing] = useState(false);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [containerFullWidth, setContainerFullWidth] = useState<number>(800);
  const [showToolbar, setShowToolbar] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(alt);

  const resolvedSrc = toAssetUrl(src);

  // Parse effective width (percent or px)
  const currentWidthStyle = dragWidth !== null
    ? `${dragWidth}px`
    : typeof rawWidth === "number"
    ? `${rawWidth}px`
    : rawWidth || "100%";

  // Update container full width on mount/resize
  useEffect(() => {
    if (containerRef.current) {
      const parent = containerRef.current.parentElement;
      if (parent) {
        setContainerFullWidth(parent.clientWidth || 800);
      }
    }
  }, []);

  const handleStartResize = (
    e: React.MouseEvent,
    handleType: ResizeHandleType
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!containerRef.current) return;
    const parentWidth =
      containerRef.current.parentElement?.clientWidth || containerFullWidth;
    setContainerFullWidth(parentWidth);

    const initialRect = containerRef.current.getBoundingClientRect();
    const zoom = useUiStore.getState().zoomLevel || 1.0;
    const startX = e.clientX;
    const startWidth = initialRect.width / zoom;

    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoom;
      let newWidth = startWidth;

      if (handleType === "right" || handleType === "corner-br") {
        newWidth = startWidth + deltaX;
      } else if (handleType === "left" || handleType === "corner-bl") {
        newWidth = startWidth - deltaX;
      }

      // Clamp between 120px and parent width
      const clampedWidth = Math.max(120, Math.min(newWidth, parentWidth));
      setDragWidth(Math.round(clampedWidth));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      setDragWidth((finalWidth) => {
        if (finalWidth !== null) {
          // If close to full parent width (>= 96%), treat as 100%
          if (finalWidth >= parentWidth * 0.96) {
            updateAttributes({ width: "100%" });
          } else {
            updateAttributes({ width: `${Math.round(finalWidth)}px` });
          }
        }
        return null;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleSetPresetWidth = (preset: "25%" | "50%" | "75%" | "100%") => {
    updateAttributes({ width: preset });
  };

  const handleSetAlignment = (newAlign: "left" | "center" | "right") => {
    updateAttributes({ align: newAlign });
  };

  const handleResetWidth = () => {
    updateAttributes({ width: "100%" });
  };

  const handleCaptionSubmit = () => {
    setIsEditingCaption(false);
    updateAttributes({ alt: captionText.trim() });
  };

  const currentPercent = dragWidth
    ? Math.round((dragWidth / containerFullWidth) * 100)
    : typeof rawWidth === "string" && rawWidth.endsWith("%")
    ? parseInt(rawWidth, 10)
    : null;

  return (
    <NodeViewWrapper
      className={`chronote-image-node-view align-${alignment} ${
        selected ? "is-selected" : ""
      } ${isResizing ? "is-resizing" : ""}`}
      data-block-id={node.attrs.id}
      onMouseEnter={() => setShowToolbar(true)}
      onMouseLeave={() => {
        if (!isResizing && !isEditingCaption) {
          setShowToolbar(false);
        }
      }}
    >
      <div
        ref={containerRef}
        className="chronote-image-container"
        style={{
          width: currentWidthStyle,
          maxWidth: "100%",
        }}
      >
        {/* Quick-action Floating Toolbar */}
        {(showToolbar || selected || isResizing) && (
          <div className="chronote-image-toolbar" contentEditable={false}>
            {/* Presets */}
            <div className="chronote-image-toolbar-group">
              {(["25%", "50%", "75%", "100%"] as const).map((pct) => (
                <button
                  key={pct}
                  type="button"
                  className={`chronote-image-btn ${rawWidth === pct ? "active" : ""}`}
                  onClick={() => handleSetPresetWidth(pct)}
                  title={`Resize to ${pct} width`}
                >
                  {pct}
                </button>
              ))}
            </div>

            <div className="chronote-image-toolbar-divider" />

            {/* Alignment */}
            <div className="chronote-image-toolbar-group">
              <button
                type="button"
                className={`chronote-image-btn ${alignment === "left" ? "active" : ""}`}
                onClick={() => handleSetAlignment("left")}
                title="Align left"
              >
                ⯇
              </button>
              <button
                type="button"
                className={`chronote-image-btn ${alignment === "center" ? "active" : ""}`}
                onClick={() => handleSetAlignment("center")}
                title="Align center"
              >
                ▬
              </button>
              <button
                type="button"
                className={`chronote-image-btn ${alignment === "right" ? "active" : ""}`}
                onClick={() => handleSetAlignment("right")}
                title="Align right"
              >
                ⯈
              </button>
            </div>

            <div className="chronote-image-toolbar-divider" />

            {/* Reset & Delete */}
            <button
              type="button"
              className="chronote-image-btn reset"
              onClick={handleResetWidth}
              title="Reset width (Double-click handle also resets)"
            >
              ↺ Reset
            </button>
            <button
              type="button"
              className="chronote-image-btn danger"
              onClick={deleteNode}
              title="Delete image"
            >
              🗑
            </button>
          </div>
        )}

        {/* Live Resize Dimension Tooltip Badge */}
        {isResizing && dragWidth !== null && (
          <div className="chronote-image-dimensions-badge" contentEditable={false}>
            {dragWidth}px {currentPercent ? `• ${currentPercent}%` : ""}
          </div>
        )}

        {/* Main Image */}
        <div className="chronote-image-element-wrapper">
          <img
            ref={imageRef}
            src={resolvedSrc}
            alt={alt}
            title={title || alt}
            className="chronote-image-element"
            loading="lazy"
            draggable={false}
          />

          {/* Interactive Resize Handles */}
          <div
            className="chronote-image-resize-handle right"
            onMouseDown={(e) => handleStartResize(e, "right")}
            onDoubleClick={handleResetWidth}
            title="Drag to resize (Double-click to reset)"
          />
          <div
            className="chronote-image-resize-handle left"
            onMouseDown={(e) => handleStartResize(e, "left")}
            onDoubleClick={handleResetWidth}
            title="Drag to resize (Double-click to reset)"
          />
          <div
            className="chronote-image-resize-handle corner-br"
            onMouseDown={(e) => handleStartResize(e, "corner-br")}
            onDoubleClick={handleResetWidth}
            title="Drag corner to resize (Double-click to reset)"
          />
          <div
            className="chronote-image-resize-handle corner-bl"
            onMouseDown={(e) => handleStartResize(e, "corner-bl")}
            onDoubleClick={handleResetWidth}
            title="Drag corner to resize (Double-click to reset)"
          />
        </div>

        {/* Caption */}
        <div className="chronote-image-caption-container" contentEditable={false}>
          {isEditingCaption ? (
            <input
              type="text"
              autoFocus
              className="chronote-image-caption-input"
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              onBlur={handleCaptionSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCaptionSubmit();
                if (e.key === "Escape") setIsEditingCaption(false);
              }}
              placeholder="Add an image caption..."
            />
          ) : (
            <div
              className={`chronote-image-caption-text ${!alt ? "placeholder" : ""}`}
              onClick={() => {
                setCaptionText(alt);
                setIsEditingCaption(true);
              }}
              title="Click to edit caption"
            >
              {alt || "Add a caption..."}
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
};
