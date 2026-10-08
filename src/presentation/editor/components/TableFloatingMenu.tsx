import React, { useEffect, useState, useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/core";
import { tableToDelimitedText } from "@domain/csvTableParser";

interface TableFloatingMenuProps {
  editor: Editor | null;
}

export const TableFloatingMenu: React.FC<TableFloatingMenuProps> = ({ editor }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if current selection is in the top row / header row
  const isTopRow = useMemo(() => {
    if (!editor || !editor.isActive("table")) return false;

    if (editor.isActive("tableHeader")) {
      return true;
    }

    const { selection } = editor.state;
    const { $from } = selection;

    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth);
      if (node.type.name === "tableRow") {
        const tableNode = $from.node(depth - 1);
        if (tableNode && tableNode.type.name === "table") {
          const rowIndex = $from.index(depth - 1);
          if (rowIndex === 0) {
            return true;
          }
        }
        break;
      }
    }

    return false;
  }, [editor?.state.selection]);

  const updatePosition = useCallback(() => {
    if (!editor || !editor.isFocused || dismissed) {
      setVisible(false);
      return;
    }

    const isInsideTable = editor.isActive("table");
    if (!isInsideTable) {
      setVisible(false);
      setDismissed(false); // Reset dismissed flag when leaving table
      return;
    }

    // Find bounding rect of the active table DOM node
    const { selection } = editor.state;
    const domAtPos = editor.view.domAtPos(selection.from);
    const element =
      domAtPos.node instanceof HTMLElement
        ? domAtPos.node
        : domAtPos.node.parentElement;

    const tableEl = element?.closest("table");
    if (!tableEl) {
      setVisible(false);
      return;
    }

    const rect = tableEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setVisible(false);
      return;
    }

    const windowHeight = window.innerHeight;
    const topChromeHeight = 84; // AppHeader (48px) + TabBar (36px)

    // Hide if table is scrolled completely above or below visible viewport
    if (rect.bottom < topChromeHeight + 10 || rect.top > windowHeight - 10) {
      setVisible(false);
      return;
    }

    // Position toolbar BELOW the table (or docked at screen bottom if table extends off-screen)
    // This completely ensures the header row at rect.top is NEVER obscured or covered!
    let top = rect.bottom + 8;
    if (top + 46 > windowHeight) {
      top = windowHeight - 48; // Dock to bottom of viewport with margin
    }

    // Horizontally center relative to the table, clamped within viewport bounds
    const menuWidth = 470;
    let left = rect.left + rect.width / 2;
    const minLeft = menuWidth / 2 + 16;
    const maxLeft = window.innerWidth - menuWidth / 2 - 16;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    setCoords({ top, left });
    setVisible(true);
  }, [editor, dismissed]);

  useEffect(() => {
    if (!editor) return;

    editor.on("selectionUpdate", updatePosition);
    editor.on("transaction", updatePosition);
    editor.on("focus", updatePosition);
    editor.on("blur", () => {
      setTimeout(() => {
        if (!document.activeElement?.closest(".table-floating-menu")) {
          setVisible(false);
        }
      }, 150);
    });

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("transaction", updatePosition);
      editor.off("focus", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [editor, updatePosition]);

  if (!editor || !visible) return null;

  const handleCopyCsv = () => {
    try {
      const { state } = editor;
      let tableNodeJson: any = null;

      // Find the current table node from doc
      state.doc.nodesBetween(state.selection.from, state.selection.to, (node) => {
        if (node.type.name === "table") {
          tableNodeJson = node.toJSON();
          return false;
        }
      });

      if (!tableNodeJson) {
        // Fallback: check ancestor nodes
        state.doc.descendants((node, pos) => {
          if (node.type.name === "table") {
            const end = pos + node.nodeSize;
            if (pos <= state.selection.from && state.selection.to <= end) {
              tableNodeJson = node.toJSON();
              return false;
            }
          }
          return true;
        });
      }

      if (tableNodeJson) {
        const csv = tableToDelimitedText(tableNodeJson, ",");
        void navigator.clipboard.writeText(csv);
        setCopiedFeedback(true);
        setTimeout(() => setCopiedFeedback(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy table as CSV:", err);
    }
  };

  return (
    <div
      className="table-floating-menu"
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        transform: "translateX(-50%)",
        zIndex: 9997,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="table-floating-group">
        <button
          type="button"
          className={`table-action-btn ${isTopRow ? "is-disabled" : ""}`}
          title={
            isTopRow
              ? "Cannot add row above header (header row must always remain on top)"
              : "Add Row Above"
          }
          disabled={isTopRow}
          onClick={() => {
            if (isTopRow) return;
            editor.chain().focus().addRowBefore().run();
          }}
        >
          <span className="table-btn-icon">+⬆</span>
          <span className="table-btn-label">Row Above</span>
        </button>

        <button
          type="button"
          className="table-action-btn"
          title="Add Row Below"
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          <span className="table-btn-icon">+⬇</span>
          <span className="table-btn-label">Row Below</span>
        </button>

        <button
          type="button"
          className="table-action-btn table-action-btn-danger"
          title="Delete Current Row"
          onClick={() => editor.chain().focus().deleteRow().run()}
        >
          <span className="table-btn-icon">✕—</span>
          <span className="table-btn-label">Del Row</span>
        </button>
      </div>

      <span className="table-floating-separator" />

      <div className="table-floating-group">
        <button
          type="button"
          className="table-action-btn"
          title="Add Column Left"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
        >
          <span className="table-btn-icon">+⬅</span>
          <span className="table-btn-label">Col Left</span>
        </button>

        <button
          type="button"
          className="table-action-btn"
          title="Add Column Right"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          <span className="table-btn-icon">+➡</span>
          <span className="table-btn-label">Col Right</span>
        </button>

        <button
          type="button"
          className="table-action-btn table-action-btn-danger"
          title="Delete Current Column"
          onClick={() => editor.chain().focus().deleteColumn().run()}
        >
          <span className="table-btn-icon">✕|</span>
          <span className="table-btn-label">Del Col</span>
        </button>
      </div>

      <span className="table-floating-separator" />

      <div className="table-floating-group">
        <button
          type="button"
          className="table-action-btn"
          title="Toggle Header Row"
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        >
          <span className="table-btn-icon">T̅</span>
          <span className="table-btn-label">Header</span>
        </button>

        <button
          type="button"
          className="table-action-btn"
          title="Copy Table as CSV"
          onClick={handleCopyCsv}
        >
          <span className="table-btn-icon">📋</span>
          <span className="table-btn-label">
            {copiedFeedback ? "Copied!" : "CSV"}
          </span>
        </button>

        <button
          type="button"
          className="table-action-btn table-action-btn-delete"
          title="Delete Entire Table"
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          <span className="table-btn-icon">🗑️</span>
        </button>

        <button
          type="button"
          className="table-action-btn table-action-btn-close"
          title="Dismiss toolbar"
          onClick={() => setDismissed(true)}
        >
          <span className="table-btn-icon">✕</span>
        </button>
      </div>
    </div>
  );
};
