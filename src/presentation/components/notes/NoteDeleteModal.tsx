import React, { useEffect } from "react";
import { useNotesStore } from "@application/stores/useNotesStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";

export const NoteDeleteModal: React.FC = () => {
  const { deleteCandidateId, setDeleteCandidateId, deleteNote, activeNote } = useNotesStore();
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

  const handleDelete = async () => {
    try {
      await deleteNote(deleteCandidateId);
    } catch (err) {
      console.error("Failed to delete note:", err);
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
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
            </svg>
          </div>
          <div>
            <div className="modal-dialog-title">Delete Note</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 2 }}>
              ID: {deleteCandidateId}
            </div>
          </div>
        </div>

        <div className="modal-dialog-body">
          Are you sure you want to delete <strong>"{targetTitle}"</strong>?
          <br />
          This will permanently delete the JSON file from your workspace notes directory and close any open tabs.
        </div>

        <div className="modal-dialog-actions">
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
            onClick={handleDelete}
            autoFocus
          >
            Delete Note
          </button>
        </div>
      </div>
    </div>
  );
};
