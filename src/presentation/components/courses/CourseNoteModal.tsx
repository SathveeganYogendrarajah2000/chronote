import React, { useState, useEffect } from "react";
import { useCoursesStore } from "@application/stores/useCoursesStore";
import { getPlatformLabel } from "@domain/courses.utils";

export const CourseNoteModal: React.FC = () => {
  const {
    isNoteModalOpen,
    activeNoteResource,
    activeNoteTopic,
    updateResourceNotes,
    updateTopicNotes,
    closeNoteModal,
  } = useCoursesStore();

  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isNoteModalOpen) {
      if (activeNoteResource) {
        setNotes(typeof activeNoteResource.notes === "string" ? activeNoteResource.notes : "");
      } else if (activeNoteTopic) {
        setNotes(typeof activeNoteTopic.notes === "string" ? activeNoteTopic.notes : "");
      }
    }
  }, [isNoteModalOpen, activeNoteResource, activeNoteTopic]);

  if (!isNoteModalOpen) return null;

  const handleSave = () => {
    if (activeNoteResource) {
      updateResourceNotes(activeNoteResource.id, notes);
    } else if (activeNoteTopic) {
      updateTopicNotes(activeNoteTopic.id, notes);
    }
    closeNoteModal();
  };

  const title = activeNoteResource
    ? `${activeNoteResource.title} (${getPlatformLabel(activeNoteResource.platform)})`
    : activeNoteTopic
    ? `${activeNoteTopic.title} (Topic Notes)`
    : "Notes";

  return (
    <div className="courses-modal-backdrop" onClick={closeNoteModal}>
      <div
        className="courses-modal-card"
        style={{ maxWidth: "700px", height: "70vh" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="courses-modal-header">
          <div>
            <span style={{ fontSize: "11px", color: "var(--accent-hover)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
              {activeNoteResource ? "Course Study Notes" : "Topic Synthesis"}
            </span>
            <h3 className="courses-modal-title" style={{ marginTop: 2 }}>{title}</h3>
          </div>
          <button
            type="button"
            className="tab-close-btn"
            onClick={closeNoteModal}
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="courses-modal-body" style={{ flex: 1 }}>
          <textarea
            className="courses-form-textarea"
            style={{ height: "100%", resize: "none", fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: "1.6" }}
            placeholder="Type your study notes, code references, timestamps, key learnings..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            autoFocus
          />
        </div>

        <div className="courses-modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={closeNoteModal}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
          >
            Save Notes
          </button>
        </div>
      </div>
    </div>
  );
};
