import React, { useState } from "react";
import { useNotesStore } from "@application/stores/useNotesStore";

export const NoteTagBar: React.FC = () => {
  const { activeNote, addTag, removeTag } = useNotesStore();
  const [newTagInput, setNewTagInput] = useState("");

  if (!activeNote) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitTag();
    }
  };

  const handleBlur = () => {
    if (newTagInput.trim().length > 0) {
      commitTag();
    }
  };

  const commitTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed) {
      addTag(trimmed);
      setNewTagInput("");
    }
  };

  return (
    <div className="note-tag-bar">
      {activeNote.tags.map((tag) => (
        <span key={tag} className="note-tag-item">
          <span>#{tag}</span>
          <button
            type="button"
            className="note-tag-remove-btn"
            title={`Remove tag #${tag}`}
            onClick={() => removeTag(tag)}
          >
            ×
          </button>
        </span>
      ))}

      <input
        type="text"
        className="note-add-tag-input"
        placeholder="+ Add tag"
        value={newTagInput}
        onChange={(e) => setNewTagInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    </div>
  );
};
