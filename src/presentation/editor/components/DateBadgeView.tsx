import React, { useRef } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

export const DateBadgeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dateVal = (node.attrs.date as string) || new Date().toISOString().slice(0, 10);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (inputRef.current) {
        if ("showPicker" in HTMLInputElement.prototype && typeof inputRef.current.showPicker === "function") {
          inputRef.current.showPicker();
        } else {
          inputRef.current.focus();
          inputRef.current.click();
        }
      }
    } catch {
      inputRef.current?.focus();
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      updateAttributes({ date: val });
    }
  };

  return (
    <NodeViewWrapper
      as="span"
      className={`chronote-date-badge ${selected ? "is-selected" : ""}`}
      onClick={handleClick}
      title="Click to change date"
    >
      <span className="chronote-date-badge-icon" aria-hidden="true">📅</span>
      <span className="chronote-date-badge-text">{dateVal}</span>
      <input
        ref={inputRef}
        type="date"
        value={dateVal}
        onChange={handleDateChange}
        className="chronote-date-badge-input"
        tabIndex={-1}
        aria-label="Select date"
      />
    </NodeViewWrapper>
  );
};

