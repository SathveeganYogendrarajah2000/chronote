import React, { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";

interface BubbleMenuBarProps {
  editor: Editor | null;
  onOpenCsvModal?: () => void;
}

export const BubbleMenuBar: React.FC<BubbleMenuBarProps> = ({ editor, onOpenCsvModal }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!editor) return;

    const updateBubbleMenu = () => {
      const { state } = editor;
      const { empty } = state.selection;

      if (empty || !editor.isFocused) {
        setVisible(false);
        return;
      }

      // Check if selection is within editor DOM
      const domSelection = window.getSelection();
      if (!domSelection || domSelection.rangeCount === 0) {
        setVisible(false);
        return;
      }

      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        setVisible(false);
        return;
      }

      setCoords({
        top: rect.top - 44,
        left: rect.left + rect.width / 2,
      });
      setVisible(true);
    };

    editor.on("selectionUpdate", updateBubbleMenu);
    editor.on("blur", () => {
      // Delay closing slightly so clicking bubble buttons doesn't immediately dismiss
      setTimeout(() => {
        if (!document.activeElement?.closest(".bubble-menu-bar")) {
          setVisible(false);
        }
      }, 150);
    });

    return () => {
      editor.off("selectionUpdate", updateBubbleMenu);
    };
  }, [editor]);

  if (!editor || !visible) {
    return null;
  }

  const isBold = editor.isActive("bold");
  const isItalic = editor.isActive("italic");
  const isUnderline = editor.isActive("underline");
  const isStrike = editor.isActive("strike");
  const isCode = editor.isActive("code");
  const isLink = editor.isActive("link");

  const toggleLink = () => {
    if (isLink) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("Enter URL (https://...):");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div
      className="bubble-menu-bar"
      style={{
        position: "fixed",
        top: Math.max(10, coords.top),
        left: coords.left,
        transform: "translateX(-50%)",
        zIndex: 9998,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        className={`bubble-btn ${isBold ? "is-active" : ""}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
      >
        <strong>B</strong>
      </button>

      <button
        type="button"
        className={`bubble-btn ${isItalic ? "is-active" : ""}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
      >
        <em>I</em>
      </button>

      <button
        type="button"
        className={`bubble-btn ${isUnderline ? "is-active" : ""}`}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline (Ctrl+U)"
      >
        <u>U</u>
      </button>

      <button
        type="button"
        className={`bubble-btn ${isStrike ? "is-active" : ""}`}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough (Ctrl+Shift+X)"
      >
        <s>S</s>
      </button>

      <span className="bubble-divider" />

      <button
        type="button"
        className={`bubble-btn ${isCode ? "is-active" : ""}`}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline Code (Ctrl+Shift+C)"
      >
        <code>&lt;/&gt;</code>
      </button>

      <button
        type="button"
        className={`bubble-btn ${isLink ? "is-active" : ""}`}
        onClick={toggleLink}
        title="External Link (Ctrl+K)"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="m7.775 3.275 1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0 .751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018 1.998 1.998 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042Zm-1.2 8.725-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0 .751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018 1.998 1.998 0 0 0-2.83 0l-2.5 2.5a2 2 0 0 0 2.83 2.83l1.25-1.25a.75.75 0 0 1 1.06 1.06l-1.25 1.25Z" />
        </svg>
      </button>

      <span className="bubble-divider" />

      <button
        type="button"
        className="bubble-btn"
        onClick={() => (editor.chain().focus() as any).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        title="Insert 3x3 Table"
      >
        <span style={{ fontSize: "13px" }}>⊞</span>
      </button>

      {onOpenCsvModal && (
        <button
          type="button"
          className="bubble-btn"
          onClick={onOpenCsvModal}
          title="Create Table from CSV / Delimited"
        >
          <span style={{ fontSize: "11px" }}>📊</span>
        </button>
      )}
    </div>
  );
};
