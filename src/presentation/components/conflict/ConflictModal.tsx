import React, { useEffect, useState } from "react";
import { useConflictStore } from "@application/stores/useConflictStore";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { ThreeWayConflictWizard } from "./ThreeWayConflictWizard";

export const ConflictModal: React.FC = () => {
  const {
    conflicts,
    activeConflict,
    isConflictModalOpen,
    setConflictModalOpen,
    resolveConflict,
    setActiveConflict,
  } = useConflictStore();

  const [resolving, setResolving] = useState(false);
  const [activeMode, setActiveMode] = useState<"quick" | "3way">("3way");

  useEffect(() => {
    if (!isConflictModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setConflictModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isConflictModalOpen, setConflictModalOpen]);

  if (!isConflictModalOpen || !activeConflict) return null;

  const handleResolve = async (strategy: "keep_local" | "use_conflicted" | "keep_both") => {
    setResolving(true);
    try {
      await resolveConflict(activeConflict.conflictFilePath, strategy);
      // Refresh notes store to reflect any new or updated notes
      void useWorkspaceStore.getState().refreshNotes();
    } finally {
      setResolving(false);
    }
  };

  return (
    <div
      className="conflict-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) setConflictModalOpen(false);
      }}
    >
      <div className="conflict-modal" role="dialog" aria-modal="true" aria-labelledby="conflict-title" style={{ maxWidth: activeMode === "3way" ? 880 : 740 }}>
        <div className="conflict-modal-header">
          <div className="conflict-header-title">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" style={{ color: "#d29922" }}>
              <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575L6.457 1.047zM8 5a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5A.75.75 0 0 0 8 5zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
            </svg>
            <h2 id="conflict-title">External Sync Conflict Detected</h2>
            <span className="conflict-source-badge">{activeConflict.syncSource}</span>
            {conflicts.length > 1 && (
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                ({conflicts.indexOf(activeConflict) + 1} of {conflicts.length})
              </span>
            )}
          </div>
          <button
            type="button"
            className="perf-modal-close"
            onClick={() => setConflictModalOpen(false)}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.752.752 0 0 1 0-1.06z" />
            </svg>
          </button>
        </div>

        <div className="conflict-modal-content">
          <div className="wizard-view-tabs">
            <button
              type="button"
              className={`wizard-tab-btn ${activeMode === "3way" ? "active" : ""}`}
              onClick={() => setActiveMode("3way")}
            >
              🧙 Interactive 3-Way Merge Wizard
            </button>
            <button
              type="button"
              className={`wizard-tab-btn ${activeMode === "quick" ? "active" : ""}`}
              onClick={() => setActiveMode("quick")}
            >
              ⚡ Quick Resolve
            </button>
          </div>

          {activeMode === "3way" ? (
            <ThreeWayConflictWizard conflict={activeConflict} onDone={() => setConflictModalOpen(false)} />
          ) : (
            <>
              <div className="conflict-explanation">
                An external synchronization tool (such as {activeConflict.syncSource}) created a duplicate conflict copy of{" "}
                <strong>{activeConflict.title}</strong>. Choose how you would like Chronote to handle this file.
              </div>

          <div className="conflict-comparison-grid">
            {/* Local Version */}
            <div className="conflict-card">
              <div className="conflict-card-header">
                <span className="conflict-card-title">Local Workspace Version</span>
                <span className="conflict-card-timestamp">
                  {activeConflict.localUpdatedAt
                    ? new Date(activeConflict.localUpdatedAt).toLocaleString()
                    : "Current"}
                </span>
              </div>
              <div className="conflict-card-preview">
                {activeConflict.title}
                {"\n"}File: {activeConflict.originalFileName}
                {"\n"}Status: Authoritative in local SQLite database
              </div>
            </div>

            {/* Remote / Conflicted Version */}
            <div className="conflict-card remote">
              <div className="conflict-card-header">
                <span className="conflict-card-title">Conflicted Remote Version</span>
                <span className="conflict-card-timestamp">
                  {activeConflict.conflictedUpdatedAt
                    ? new Date(activeConflict.conflictedUpdatedAt).toLocaleString()
                    : new Date(activeConflict.conflictDetectedAt).toLocaleString()}
                </span>
              </div>
              <div className="conflict-card-preview">
                {activeConflict.previewText || "Content preview unavailable"}
              </div>
            </div>
          </div>

                {conflicts.length > 1 && (
                  <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                    {conflicts.map((c, i) => (
                      <button
                        key={c.conflictFilePath}
                        type="button"
                        className={`header-workspace-btn ${c === activeConflict ? "active" : ""}`}
                        onClick={() => setActiveConflict(c)}
                        style={{ fontSize: "11px", padding: "4px 8px" }}
                      >
                        {i + 1}. {c.title}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {activeMode === "quick" && (
            <div className="conflict-modal-footer">
              <button
                type="button"
                className="conflict-btn-danger"
                disabled={resolving}
                onClick={() => handleResolve("keep_local")}
                title="Discard the external conflict file and keep only your local version."
              >
                Discard Conflicted File
              </button>

              <div className="conflict-action-buttons">
                <button
                  type="button"
                  className="conflict-btn-warning"
                  disabled={resolving}
                  onClick={() => handleResolve("use_conflicted")}
                  title="Replace your local file with this conflicted version."
                >
                  Overwrite with Conflicted
                </button>
                <button
                  type="button"
                  className="conflict-btn-primary"
                  disabled={resolving}
                  onClick={() => handleResolve("keep_both")}
                  title="Save the conflicted version as a separate new note with zero data loss."
                >
                  Keep Both as Separate Notes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  );
};
