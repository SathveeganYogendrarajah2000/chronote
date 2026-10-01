import React, { useRef, useEffect } from "react";
import { TableOfContents } from "./TableOfContents";
import { useUiStore } from "@application/stores/useUiStore";

interface FloatingTocPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string | undefined;
}

export const FloatingTocPopover: React.FC<FloatingTocPopoverProps> = ({
  isOpen,
  onClose,
  title = "Table of Contents",
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const { openResourceOutline } = useUiStore();

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDockToSidebar = () => {
    openResourceOutline();
    onClose();
  };

  return (
    <div ref={popoverRef} className="floating-toc-dropdown">
      <div className="floating-toc-header">
        <span className="floating-toc-title">
          <span>📑</span>
          <span>{title}</span>
        </span>
        <button
          type="button"
          className="floating-toc-dock-btn"
          onClick={handleDockToSidebar}
          title="Open Outline in Resource Inspector"
        >
          Dock →
        </button>
      </div>

      <div style={{ maxHeight: "300px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TableOfContents onHeadingClick={onClose} showContextBanner={false} />
      </div>
    </div>
  );
};
