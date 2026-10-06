import React, { useState, useEffect } from "react";
import type { SyncConflictInfo } from "@infrastructure/tauri/ipcBridge";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";
import type { GeneralNote } from "@domain/note.types";
import {
  analyzeGeneralNoteDiff,
  buildMergedGeneralNote,
  type ThreeWayDiffResult,
} from "@domain/conflictMerge";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { useConflictStore } from "@application/stores/useConflictStore";

interface Props {
  conflict: SyncConflictInfo;
  onDone: () => void;
}

export const ThreeWayConflictWizard: React.FC<Props> = ({ conflict, onDone }) => {
  const [localNote, setLocalNote] = useState<GeneralNote | null>(null);
  const [remoteNote, setRemoteNote] = useState<GeneralNote | null>(null);
  const [diffResult, setDiffResult] = useState<ThreeWayDiffResult | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadNotes = async () => {
      try {
        setError(null);
        // Load local note
        const local = await ipcBridge.readGeneralNote(conflict.targetId);
        // Load conflicted file by path
        // Note: For preview/reading conflict copy, we can read local or use preview
        // If conflict note is general note, we synthesize it from conflict info or preview:
        let remote: GeneralNote;
        try {
          const res = await fetch(`file://${conflict.conflictFilePath}`).then((r) => r.json());
          remote = res;
        } catch {
          // Fallback if direct fetch is blocked by browser security
          remote = {
            ...local,
            title: conflict.title,
            updatedAt: conflict.conflictedUpdatedAt || conflict.conflictDetectedAt,
          };
        }

        if (!isCancelled) {
          setLocalNote(local);
          setRemoteNote(remote);
          const diff = analyzeGeneralNoteDiff(local, remote);
          setDiffResult(diff);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(`Failed to prepare 3-way merge: ${err?.message || String(err)}`);
        }
      }
    };

    void loadNotes();
    return () => {
      isCancelled = true;
    };
  }, [conflict]);

  if (error) {
    return <div style={{ color: "#f85149", padding: "16px" }}>{error}</div>;
  }

  if (!localNote || !remoteNote || !diffResult) {
    return (
      <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
        Analyzing documents for 3-way conflict merge...
      </div>
    );
  }

  const handleTitleChoice = (choice: "local" | "remote") => {
    setDiffResult({ ...diffResult, chosenTitleChoice: choice });
  };

  const handleTagsChoice = (choice: "local" | "remote" | "union") => {
    setDiffResult({ ...diffResult, chosenTagsChoice: choice });
  };

  const handleBlockChoice = (blockId: string, choice: "local" | "remote" | "both") => {
    const nextBlocks = diffResult.conflictingBlocks.map((b) =>
      b.id === blockId ? { ...b, chosen: choice } : b
    );
    setDiffResult({ ...diffResult, conflictingBlocks: nextBlocks });
  };

  const handleCommitMerge = async () => {
    setIsCommitting(true);
    try {
      const mergedNote = buildMergedGeneralNote(localNote, remoteNote, diffResult);
      await ipcBridge.resolve3WayConflict(
        conflict.conflictFilePath,
        conflict.targetId,
        conflict.documentType,
        JSON.stringify(mergedNote)
      );

      // Refresh stores
      void useWorkspaceStore.getState().refreshNotes();
      void useConflictStore.getState().scanConflicts();
      onDone();
    } catch (err: any) {
      setError(`Failed to apply 3-way merge: ${err?.message || String(err)}`);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="conflict-wizard-container">
      <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
        Select which changes to keep for each section, or keep both. Your selections are merged into a clean final note.
      </div>

      <div className="wizard-3way-grid">
        {/* Left Column: Local Version */}
        <div className="wizard-column">
          <div className="wizard-column-header">
            <span className="wizard-column-title">Local Version</span>
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Your Workstation</span>
          </div>

          <div className="wizard-section-card">
            <span style={{ fontSize: "11px", fontWeight: 600 }}>Title:</span>
            <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>{localNote.title}</span>
          </div>

          <div className="wizard-section-card">
            <span style={{ fontSize: "11px", fontWeight: 600 }}>Tags:</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              {localNote.tags.join(", ") || "(none)"}
            </span>
          </div>

          {diffResult.conflictingBlocks.map((b, i) => (
            <div key={b.id} className="wizard-section-card conflicted">
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                Block #{i + 1} ({b.blockType})
              </span>
              <div style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>
                {b.localText || "(empty block)"}
              </div>
            </div>
          ))}
        </div>

        {/* Middle Column: Merged Resolution */}
        <div className="wizard-column merged-result">
          <div className="wizard-column-header">
            <span className="wizard-column-title" style={{ color: "#38bdf8" }}>
              Merged Result (Preview)
            </span>
            <span style={{ fontSize: "10px", color: "#38bdf8" }}>Active Output</span>
          </div>

          {/* Title Resolution */}
          <div className="wizard-section-card">
            <span style={{ fontSize: "11px", fontWeight: 600 }}>Title:</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
              {diffResult.chosenTitleChoice === "remote" ? remoteNote.title : localNote.title}
            </span>
            {diffResult.hasTitleConflict && (
              <div className="wizard-choice-bar">
                <button
                  type="button"
                  className={`wizard-choice-btn ${diffResult.chosenTitleChoice === "local" ? "selected" : ""}`}
                  onClick={() => handleTitleChoice("local")}
                >
                  ← Keep Local
                </button>
                <button
                  type="button"
                  className={`wizard-choice-btn ${diffResult.chosenTitleChoice === "remote" ? "selected" : ""}`}
                  onClick={() => handleTitleChoice("remote")}
                >
                  Keep Remote →
                </button>
              </div>
            )}
          </div>

          {/* Tags Resolution */}
          <div className="wizard-section-card">
            <span style={{ fontSize: "11px", fontWeight: 600 }}>Tags:</span>
            <span style={{ fontSize: "11px", color: "#38bdf8" }}>
              {diffResult.chosenTagsChoice === "remote"
                ? remoteNote.tags.join(", ")
                : diffResult.chosenTagsChoice === "union"
                ? Array.from(new Set([...localNote.tags, ...remoteNote.tags])).join(", ")
                : localNote.tags.join(", ") || "(none)"}
            </span>
            {diffResult.hasTagConflict && (
              <div className="wizard-choice-bar">
                <button
                  type="button"
                  className={`wizard-choice-btn ${diffResult.chosenTagsChoice === "local" ? "selected" : ""}`}
                  onClick={() => handleTagsChoice("local")}
                >
                  Local
                </button>
                <button
                  type="button"
                  className={`wizard-choice-btn ${diffResult.chosenTagsChoice === "union" ? "selected" : ""}`}
                  onClick={() => handleTagsChoice("union")}
                >
                  Union (Both)
                </button>
                <button
                  type="button"
                  className={`wizard-choice-btn ${diffResult.chosenTagsChoice === "remote" ? "selected" : ""}`}
                  onClick={() => handleTagsChoice("remote")}
                >
                  Remote
                </button>
              </div>
            )}
          </div>

          {/* Conflicting Content Blocks */}
          {diffResult.conflictingBlocks.map((b, i) => (
            <div key={b.id} className="wizard-section-card conflicted">
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                Conflict #{i + 1}: {b.blockType}
              </span>
              <div style={{ fontSize: "12px", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
                {b.chosen === "remote"
                  ? b.remoteText
                  : b.chosen === "both"
                  ? `${b.localText}\n---\n${b.remoteText}`
                  : b.localText || "(empty block)"}
              </div>
              <div className="wizard-choice-bar">
                <button
                  type="button"
                  className={`wizard-choice-btn ${b.chosen === "local" ? "selected" : ""}`}
                  onClick={() => handleBlockChoice(b.id, "local")}
                >
                  ← Local
                </button>
                <button
                  type="button"
                  className={`wizard-choice-btn ${b.chosen === "both" ? "selected" : ""}`}
                  onClick={() => handleBlockChoice(b.id, "both")}
                >
                  ⮂ Combine Both
                </button>
                <button
                  type="button"
                  className={`wizard-choice-btn ${b.chosen === "remote" ? "selected" : ""}`}
                  onClick={() => handleBlockChoice(b.id, "remote")}
                >
                  Remote →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Conflicted Remote Version */}
        <div className="wizard-column">
          <div className="wizard-column-header">
            <span className="wizard-column-title">Conflicted Remote</span>
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{conflict.syncSource}</span>
          </div>

          <div className="wizard-section-card">
            <span style={{ fontSize: "11px", fontWeight: 600 }}>Title:</span>
            <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>{remoteNote.title}</span>
          </div>

          <div className="wizard-section-card">
            <span style={{ fontSize: "11px", fontWeight: 600 }}>Tags:</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              {remoteNote.tags.join(", ") || "(none)"}
            </span>
          </div>

          {diffResult.conflictingBlocks.map((b, i) => (
            <div key={b.id} className="wizard-section-card conflicted">
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                Block #{i + 1} ({b.blockType})
              </span>
              <div style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>
                {b.remoteText || "(empty block)"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
        <button
          type="button"
          className="btn-primary"
          disabled={isCommitting}
          onClick={handleCommitMerge}
          style={{ background: "#2563eb", padding: "8px 18px", fontSize: "13px" }}
        >
          {isCommitting ? "Applying 3-Way Merge..." : "✓ Commit 3-Way Merge & Resolve"}
        </button>
      </div>
    </div>
  );
};
