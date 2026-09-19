import React, { useState, useEffect, useRef } from "react";
import type { ProseMirrorNode } from "@domain/document.types";
import { proseMirrorDocToText } from "@domain/dsm.utils";

interface DsmEntryEditorProps {
  content: ProseMirrorNode;
  onUpdateText: (text: string) => void;
}

export const DsmEntryEditor: React.FC<DsmEntryEditorProps> = ({
  content,
  onUpdateText,
}) => {
  const initialText = useRef(proseMirrorDocToText(content));
  const [text, setText] = useState<string>(initialText.current);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state if external content updates (e.g. after reload)
  useEffect(() => {
    const nextText = proseMirrorDocToText(content);
    if (nextText !== text) {
      setText(nextText);
    }
  }, [content]);

  // Auto-grow textarea height to fit content without scrollbars
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(120, el.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    onUpdateText(val);
  };

  return (
    <div className="dsm-content-area">
      <textarea
        ref={textareaRef}
        className="dsm-textarea-editor"
        placeholder="What did you work on today? (Investigations, PRs, queries, commands, blockers...)"
        value={text}
        onChange={handleChange}
        rows={4}
      />
    </div>
  );
};
