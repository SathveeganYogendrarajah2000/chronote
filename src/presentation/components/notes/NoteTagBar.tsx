import React from "react";
import { useNotesStore } from "@application/stores/useNotesStore";
import { TagPicker } from "@presentation/components/common/TagPicker";

export const NoteTagBar: React.FC = () => {
  const { activeNote, addTag, removeTag } = useNotesStore();

  if (!activeNote) return null;

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

      <TagPicker
        currentTags={activeNote.tags}
        onAddTag={addTag}
        placeholder="+ Select or type tag"
        buttonLabel="+ Add tag"
        size="small"
      />
    </div>
  );
};

