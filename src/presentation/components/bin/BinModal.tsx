import React, { useEffect, useMemo, useState } from "react";
import { useBinStore } from "@application/stores/useBinStore";
import { getDaysRemaining, formatDaysRemaining } from "@domain/bin.utils";
import type { BinnedNoteRecord } from "@domain/bin.types";
import { proseMirrorDocToText } from "@domain/dsm.utils";

export const BinModal: React.FC = () => {
  const {
    isBinModalOpen,
    closeBinModal,
    binnedNotes,
    isLoading,
    restoreNote,
    deletePermanently,
    emptyBin,
    previewNote,
    setPreviewNote,
  } = useBinStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<"all" | "dsm" | "notes" | "expiring_soon">("all");
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isDsmNote = (item: BinnedNoteRecord) =>
    item.originalSection === "Daily Stand-up" ||
    item.id.startsWith("ent_") ||
    Boolean(item.dsmDate);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isBinModalOpen) {
        closeBinModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBinModalOpen, closeBinModal]);

  // Auto-select first note for preview if available and none selected
  useEffect(() => {
    if (binnedNotes.length > 0 && !previewNote) {
      setPreviewNote(binnedNotes[0]);
    } else if (binnedNotes.length === 0) {
      setPreviewNote(null);
    }
  }, [binnedNotes, previewNote, setPreviewNote]);

  // Filter notes by search query and section
  const filteredNotes = useMemo(() => {
    const clean = searchQuery.trim().toLowerCase();
    return binnedNotes.filter((item) => {
      // Search match
      const matchesSearch =
        !clean ||
        item.title.toLowerCase().includes(clean) ||
        item.tags.some((t) => t.toLowerCase().includes(clean));

      if (!matchesSearch) return false;

      // Section match
      if (activeSection === "dsm") {
        return isDsmNote(item);
      }
      if (activeSection === "notes") {
        return !isDsmNote(item);
      }
      if (activeSection === "expiring_soon") {
        const days = getDaysRemaining(item.expiresAt);
        return days <= 5;
      }
      return true;
    });
  }, [binnedNotes, searchQuery, activeSection]);

  const dsmCount = useMemo(() => binnedNotes.filter(isDsmNote).length, [binnedNotes]);
  const notesCount = useMemo(() => binnedNotes.filter((n) => !isDsmNote(n)).length, [binnedNotes]);
  const expiringSoonCount = useMemo(() => {
    return binnedNotes.filter((n) => getDaysRemaining(n.expiresAt) <= 5).length;
  }, [binnedNotes]);

  if (!isBinModalOpen) return null;

  const handleRestore = async (e: React.MouseEvent, item: BinnedNoteRecord) => {
    e.stopPropagation();
    try {
      await restoreNote(item.id);
    } catch (err) {
      console.error("Failed to restore note:", err);
    }
  };

  const handlePermanentDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deletePermanently(id);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Failed to permanently delete note:", err);
    }
  };

  const handleEmptyBin = async () => {
    try {
      await emptyBin();
      setConfirmEmpty(false);
    } catch (err) {
      console.error("Failed to empty bin:", err);
    }
  };

  const previewPlainText = previewNote?.note?.content
    ? proseMirrorDocToText(previewNote.note.content)
    : "No text content.";

  return (
    <div
      className="modal-backdrop"
      onClick={closeBinModal}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-dialog bin-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-dialog-header" style={{ marginBottom: 0 }}>
          <div className="modal-dialog-icon" style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#f87171" }}>
            🗑️
          </div>
          <div style={{ flex: 1 }}>
            <div className="modal-dialog-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>Recycle Bin</span>
              <span className="bin-days-pill normal">
                {binnedNotes.length} {binnedNotes.length === 1 ? "note" : "notes"}
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 2 }}>
              Deleted notes are kept for 30 days before being automatically purged.
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={closeBinModal}
            title="Close (Esc)"
            style={{ fontSize: "16px", padding: "4px 8px" }}
          >
            ×
          </button>
        </div>

        {/* Action & Filter Bar */}
        <div style={{ padding: "10px var(--space-4) 0 var(--space-4)" }}>
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginBottom: 8 }}>
            <input
              type="text"
              className="bin-filter-input"
              placeholder="Search in deleted notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {binnedNotes.length > 0 && !confirmEmpty && (
              <button
                type="button"
                className="bin-action-btn danger"
                onClick={() => setConfirmEmpty(true)}
                title="Permanently delete all notes in bin"
              >
                Empty Bin
              </button>
            )}
            {confirmEmpty && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "11px", color: "#f87171", fontWeight: 600 }}>
                  Delete all permanently?
                </span>
                <button
                  type="button"
                  className="bin-action-btn danger"
                  onClick={handleEmptyBin}
                  style={{ background: "#dc2626", color: "#fff" }}
                >
                  Yes, Empty
                </button>
                <button
                  type="button"
                  className="bin-action-btn"
                  onClick={() => setConfirmEmpty(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Section Tabs inside Bin */}
          <div className="bin-section-tabs">
            <button
              type="button"
              className={`bin-section-tab-btn ${activeSection === "all" ? "active" : ""}`}
              onClick={() => setActiveSection("all")}
            >
              <span>All Notes</span>
              <span className="resource-count-badge">{binnedNotes.length}</span>
            </button>
            <button
              type="button"
              className={`bin-section-tab-btn ${activeSection === "dsm" ? "active" : ""}`}
              onClick={() => setActiveSection("dsm")}
            >
              <span>📅 Daily Stand-up</span>
              {dsmCount > 0 && <span className="resource-count-badge">{dsmCount}</span>}
            </button>
            <button
              type="button"
              className={`bin-section-tab-btn ${activeSection === "notes" ? "active" : ""}`}
              onClick={() => setActiveSection("notes")}
            >
              <span>📝 General Notes</span>
              {notesCount > 0 && <span className="resource-count-badge">{notesCount}</span>}
            </button>
            <button
              type="button"
              className={`bin-section-tab-btn ${activeSection === "expiring_soon" ? "active" : ""}`}
              onClick={() => setActiveSection("expiring_soon")}
            >
              <span>⏳ Expiring Soon</span>
              {expiringSoonCount > 0 && (
                <span
                  className="resource-count-badge"
                  style={{ background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24" }}
                >
                  {expiringSoonCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main Content Pane */}
        <div style={{ padding: "0 var(--space-4) var(--space-4) var(--space-4)", flex: 1, overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--text-muted)" }}>
              Loading bin...
            </div>
          ) : binnedNotes.length === 0 ? (
            <div className="bin-empty-state">
              <div className="bin-empty-state-icon">🗑️</div>
              <div style={{ fontSize: "var(--font-size-md)", fontWeight: 600, color: "var(--text-primary)" }}>
                Bin is Empty
              </div>
              <div style={{ fontSize: "var(--font-size-xs)", maxWidth: "360px" }}>
                Deleted notes will appear here and be preserved for 30 days before permanent deletion. You can restore them anytime.
              </div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--text-muted)", fontSize: "var(--font-size-xs)" }}>
              No notes match "{searchQuery}".
            </div>
          ) : (
            <div className="bin-main-layout">
              {/* Note List */}
              <div className="bin-list-container">
                {filteredNotes.map((item) => {
                  const days = getDaysRemaining(item.expiresAt);
                  const isSelected = previewNote?.id === item.id;
                  const isExpiringSoon = days <= 5;
                  const isToday = days <= 0;

                  return (
                    <div
                      key={item.id}
                      className={`bin-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setPreviewNote(item)}
                    >
                      <div className="bin-card-header">
                        <span className="bin-card-title">{item.title || "Untitled Note"}</span>
                        <span
                          className={`bin-days-pill ${
                            isToday ? "critical" : isExpiringSoon ? "warning" : "normal"
                          }`}
                        >
                          ⏳ {formatDaysRemaining(days)}
                        </span>
                      </div>

                      <div className="bin-card-meta">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "1px 5px",
                              borderRadius: "3px",
                              background: isDsmNote(item)
                                ? "rgba(99, 102, 241, 0.15)"
                                : "rgba(255, 255, 255, 0.08)",
                              color: isDsmNote(item) ? "#a5b4fc" : "var(--text-secondary)",
                              fontWeight: 500,
                            }}
                          >
                            {isDsmNote(item) ? "📅 Stand-up" : "📝 Note"}
                          </span>
                          <span>
                            Deleted {new Date(item.deletedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </span>

                        <div className="bin-card-actions">
                          <button
                            type="button"
                            className="bin-action-btn restore"
                            onClick={(e) => handleRestore(e, item)}
                            title="Restore note to workspace"
                          >
                            ↺ Restore
                          </button>
                          {confirmDeleteId === item.id ? (
                            <button
                              type="button"
                              className="bin-action-btn danger"
                              onClick={(e) => handlePermanentDelete(e, item.id)}
                              style={{ background: "#dc2626", color: "#fff" }}
                              title="Confirm permanent deletion"
                            >
                              Confirm
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="bin-action-btn danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(item.id);
                              }}
                              title="Delete permanently"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>

                      {item.tags.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 2 }}>
                          {item.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: "10px",
                                background: "rgba(255, 255, 255, 0.06)",
                                padding: "1px 5px",
                                borderRadius: "3px",
                                color: "var(--text-muted)",
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Note Preview Pane */}
              {previewNote && (
                <div className="bin-preview-pane">
                  <div className="bin-preview-header">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--text-primary)" }}>
                          {previewNote.title || "Untitled Note"}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 2 }}>
                          ID: {previewNote.id} • Section: {previewNote.originalSection}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="bin-action-btn restore"
                          onClick={(e) => handleRestore(e, previewNote)}
                          title="Restore note to workspace"
                        >
                          ↺ Restore Note
                        </button>
                        <button
                          type="button"
                          className="bin-action-btn danger"
                          onClick={(e) => handlePermanentDelete(e, previewNote.id)}
                          title="Delete note permanently"
                        >
                          Delete Permanently
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: "11px", color: "var(--text-muted)" }}>
                      <span>Deleted: {new Date(previewNote.deletedAt).toLocaleString()}</span>
                      <span>Expires: {new Date(previewNote.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="bin-preview-content">
                    {previewPlainText}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
