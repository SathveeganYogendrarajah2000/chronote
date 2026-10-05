import React, { useEffect } from "react";
import { useNotesStore } from "@application/stores/useNotesStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";

export const NoteDeleteModal: React.FC = () => {
  const {
    deleteCandidateId,
    setDeleteCandidateId,
    deleteNote,
    deleteNotePermanently,
    activeNote,
  } = useNotesStore();
  const { recentNotes } = useWorkspaceStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && deleteCandidateId) {
        setDeleteCandidateId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteCandidateId, setDeleteCandidateId]);

  if (!deleteCandidateId) return null;

  const targetTitle =
    (activeNote?.id === deleteCandidateId ? activeNote.title : null) ??
    recentNotes.find((n) => n.id === deleteCandidateId)?.title ??
    "Untitled Note";

  const handleMoveToBin = async () => {
    try {
      await deleteNote(deleteCandidateId);
    } catch (err) {
      console.error("Failed to move note to bin:", err);
    }
  };

  const handlePermanentDelete = async () => {
    try {
      await deleteNotePermanently(deleteCandidateId);
    } catch (err) {
      console.error("Failed to permanently delete note:", err);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={() => setDeleteCandidateId(null)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-dialog-header">
          <div className="modal-dialog-icon">
            🗑️
          </div>
          <div>
            <div className="modal-dialog-title">Move Note to Bin</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 2 }}>
              ID: {deleteCandidateId}
            </div>
          </div>
        </div>

        <div className="modal-dialog-body">
          Are you sure you want to move <strong>"{targetTitle}"</strong> to the Recycle Bin?
          <br />
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: 6, display: "inline-block" }}>
            This note will be safely preserved in your workspace Bin for 30 days. You can restore it anytime from the Bin section.
          </span>
        </div>

        <div className="modal-dialog-actions" style={{ justifyContent: "space-between" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handlePermanentDelete}
            style={{ color: "#f87171", fontSize: "11px" }}
            title="Bypass bin and permanently erase from disk"
          >
            Delete Permanently
          </button>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setDeleteCandidateId(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={handleMoveToBin}
              autoFocus
            >
              Move to Bin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
