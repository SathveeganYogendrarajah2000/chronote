import React from "react";
import type { ProseMirrorNode } from "@domain/document.types";
import { deriveDsmEntryPreview } from "@domain/dsm.utils";

interface DsmSummaryPreviewProps {
  content: ProseMirrorNode;
  onExpand: () => void;
}

export const DsmSummaryPreview: React.FC<DsmSummaryPreviewProps> = ({
  content,
  onExpand,
}) => {
  const preview = deriveDsmEntryPreview(content);

  return (
    <div
      className="dsm-summary-preview"
      onClick={onExpand}
      title="Click or press Space/Enter to expand entry"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onExpand();
        }
      }}
    >
      <span className="dsm-preview-text">
        {preview}
      </span>
      <span className="dsm-preview-expand-hint">
        Click to expand ▾
      </span>
    </div>
  );
};
