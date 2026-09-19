import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";

import type { ProseMirrorNode } from "@domain/document.types";
import { proseMirrorDocToText } from "@domain/dsm.utils";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { useDsmStore } from "@application/stores/useDsmStore";

import { CustomCodeBlock } from "./extensions/CodeBlockExtension";
import { InternalLink } from "./extensions/InternalLinkExtension";
import { InternalLinkSuggestion } from "./extensions/InternalLinkSuggestion";
import {
  InternalLinkPopover,
  type LinkCandidate,
} from "./components/InternalLinkPopover";
import { SlashCommand } from "./extensions/SlashCommandExtension";
import {
  SlashCommandMenu,
  type SlashCommandItem,
} from "./components/SlashCommandMenu";
import { BubbleMenuBar } from "./components/BubbleMenuBar";

export interface ChronoteEditorProps {
  content: ProseMirrorNode;
  onChange?: ((content: ProseMirrorNode, plainText: string) => void) | undefined;
  placeholder?: string | undefined;
  editable?: boolean | undefined;
  autoFocus?: boolean | undefined;
  onNavigateToNote?: ((targetNoteId: string) => void) | undefined;
  className?: string | undefined;
}

export const ChronoteEditor: React.FC<ChronoteEditorProps> = ({
  content,
  onChange,
  placeholder = "Write notes, investigations, code blocks, or type / for commands...",
  editable = true,
  autoFocus = false,
  onNavigateToNote,
  className = "",
}) => {
  const { recentNotes } = useWorkspaceStore();
  const { dsmDoc } = useDsmStore();

  // Suggestion Popover State for [[
  const [linkPopoverState, setLinkPopoverState] = useState<{
    items: LinkCandidate[];
    selectedIndex: number;
    coords: { top: number; left: number };
    onSelect: (item: LinkCandidate) => void;
  } | null>(null);

  // Slash Command Palette State for /
  const [slashMenuState, setSlashMenuState] = useState<{
    items: SlashCommandItem[];
    selectedIndex: number;
    coords: { top: number; left: number };
    onSelect: (item: SlashCommandItem) => void;
  } | null>(null);

  // Build candidate list for internal links
  const getCandidates = useCallback((): LinkCandidate[] => {
    const candidates: LinkCandidate[] = [];

    // General Notes
    for (const note of recentNotes) {
      candidates.push({
        id: note.id,
        title: note.title,
        tags: note.tags,
        type: "note",
      });
    }

    // DSM Entries (Recent Stand-up Dates)
    if (dsmDoc?.entries) {
      for (const entry of dsmDoc.entries.slice(0, 5)) {
        candidates.push({
          id: `dsm:${entry.date}`,
          title: `DSM Stand-up (${entry.date})`,
          tags: entry.tags,
          type: "dsm",
        });
      }
    }

    return candidates;
  }, [recentNotes, dsmDoc?.entries]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        codeBlock: false,
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "editor-external-link",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
      CustomCodeBlock,
      InternalLink,
      InternalLinkSuggestion.configure({
        getCandidates,
        onOpen: (state) => setLinkPopoverState(state),
        onClose: () => setLinkPopoverState(null),
      }),
      SlashCommand.configure({
        onOpen: (state) => setSlashMenuState(state),
        onClose: () => setSlashMenuState(null),
      }),
    ],
    [getCandidates, placeholder]
  );

  const editor = useEditor({
    extensions,
    content,
    editable,
    autofocus: autoFocus,
    onUpdate: ({ editor }) => {
      if (onChange) {
        const json = editor.getJSON() as ProseMirrorNode;
        const text = proseMirrorDocToText(json);
        onChange(json, text);
      }
    },
  });

  // Keep editor content in sync when external content prop changes (e.g. Switching active tabs)
  useEffect(() => {
    if (!editor || !content) return;

    // Check if the doc is already matching to prevent resetting cursor
    const currentJson = editor.getJSON();
    if (JSON.stringify(currentJson) !== JSON.stringify(content)) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  // Handle internal link navigation clicks
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const linkEl = target.closest<HTMLElement>("[data-internal-link='true']");

    if (linkEl) {
      const targetNoteId = linkEl.getAttribute("data-target-note-id");
      if (targetNoteId && onNavigateToNote) {
        e.preventDefault();
        e.stopPropagation();
        onNavigateToNote(targetNoteId);
      }
    }
  };

  return (
    <div
      className={`chronote-editor-container ${className}`}
      onClick={handleEditorClick}
    >
      <BubbleMenuBar editor={editor} />
      <EditorContent editor={editor} className="chronote-editor-content" />

      {linkPopoverState && (
        <InternalLinkPopover
          items={linkPopoverState.items}
          selectedIndex={linkPopoverState.selectedIndex}
          coords={linkPopoverState.coords}
          onSelect={(item) => {
            linkPopoverState.onSelect(item);
            setLinkPopoverState(null);
          }}
        />
      )}

      {slashMenuState && (
        <SlashCommandMenu
          items={slashMenuState.items}
          selectedIndex={slashMenuState.selectedIndex}
          coords={slashMenuState.coords}
          onSelect={(item) => {
            slashMenuState.onSelect(item);
            setSlashMenuState(null);
          }}
        />
      )}
    </div>
  );
};
