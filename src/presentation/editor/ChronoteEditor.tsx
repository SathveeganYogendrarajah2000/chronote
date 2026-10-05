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
import { CustomImage } from "./extensions/ImageExtension";
import { AttachmentExtension } from "./extensions/AttachmentExtension";
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
import { BlockId } from "./extensions/BlockIdExtension";
import { processFileAsset } from "@infrastructure/tauri/assetHelper";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";
import { NodeSelection } from "@tiptap/pm/state";
import { useTocStore } from "@application/stores/useTocStore";
import { useResourceStore } from "@application/stores/useResourceStore";

export interface ChronoteEditorProps {
  content: ProseMirrorNode;
  onChange?: ((content: ProseMirrorNode, plainText: string) => void) | undefined;
  placeholder?: string | undefined;
  editable?: boolean | undefined;
  autoFocus?: boolean | undefined;
  onNavigateToNote?: ((targetNoteId: string) => void) | undefined;
  onEditorFocus?: (() => void) | undefined;
  editorContextKey?: string | undefined;
  className?: string | undefined;
}

export const ChronoteEditor: React.FC<ChronoteEditorProps> = ({
  content,
  onChange,
  placeholder = "Write notes, investigations, code blocks, or type / for commands...",
  editable = true,
  autoFocus = false,
  onNavigateToNote,
  onEditorFocus,
  editorContextKey,
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

  // Drag-and-drop state for dropping notes
  const [isDragOver, setIsDragOver] = useState(false);

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
        link: false,
        underline: false,
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
      CustomImage,
      AttachmentExtension,
      InternalLink.configure({
        getCandidates,
      }),
      InternalLinkSuggestion.configure({
        getCandidates,
        onOpen: (state) => setLinkPopoverState(state),
        onClose: () => setLinkPopoverState(null),
      }),
      SlashCommand.configure({
        onOpen: (state) => setSlashMenuState(state),
        onClose: () => setSlashMenuState(null),
      }),
      BlockId,
    ],
    [getCandidates, placeholder]
  );

  const editor = useEditor({
    extensions,
    content,
    editable,
    autofocus: autoFocus,
    editorProps: {
      handlePaste: (view, event) => {
        const files = event.clipboardData?.files;
        if (files && files.length > 0) {
          const imageFiles = Array.from(files).filter(
            (f) => f.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(f.name)
          );
          if (imageFiles.length > 0) {
            event.preventDefault();
            for (const file of imageFiles) {
              void processFileAsset(file).then((asset) => {
                const node = view.state.schema.nodes.image?.create({
                  src: asset.src,
                  filePath: asset.filePath,
                  alt: asset.fileName,
                  assetId: asset.assetId,
                  title: asset.fileName,
                });
                if (node) {
                  const tr = view.state.tr.replaceSelectionWith(node);
                  view.dispatch(tr);
                }
              });
            }
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        // 1. Files dropped from OS explorer / folder
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          event.preventDefault();
          const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
          let insertPos = coordinates ? coordinates.pos : view.state.selection.from;

          for (const file of Array.from(files)) {
            void processFileAsset(file).then((asset) => {
              if (asset.isImage) {
                const node = view.state.schema.nodes.image?.create({
                  src: asset.src,
                  filePath: asset.filePath,
                  alt: asset.fileName,
                  assetId: asset.assetId,
                  title: asset.fileName,
                });
                if (node) {
                  const tr = view.state.tr.insert(insertPos, node);
                  view.dispatch(tr);
                  insertPos += node.nodeSize;
                }
              } else {
                const node = view.state.schema.nodes.attachment?.create({
                  src: asset.src,
                  filePath: asset.filePath,
                  fileName: asset.fileName,
                  fileSize: asset.fileSize,
                  mimeType: asset.mimeType,
                  assetId: asset.assetId,
                });
                if (node) {
                  const tr = view.state.tr.insert(insertPos, node);
                  view.dispatch(tr);
                  insertPos += node.nodeSize;
                }
              }
            });
          }
          return true;
        }

        // 2. Note drag-and-drop
        const rawNoteData = event.dataTransfer?.getData("application/x-chronote-note");
        if (rawNoteData) {
          try {
            const { id, title } = JSON.parse(rawNoteData);
            if (id && title) {
              event.preventDefault();
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              const insertPos = coordinates ? coordinates.pos : view.state.selection.from;

              const mark = view.state.schema.marks.internalLink?.create({
                targetNoteId: id,
                originalTitle: title,
              });

              const tr = view.state.tr;
              const textNode = view.state.schema.text(title, mark ? [mark] : []);
              const spaceNode = view.state.schema.text(" ");

              tr.insert(insertPos, [textNode, spaceNode]);
              view.dispatch(tr);
              view.focus();
              return true;
            }
          } catch (err) {
            console.error("Failed to insert dropped note link:", err);
          }
        }
        return false;
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement;

        // Attachment card click -> open file or reveal in explorer
        const attachmentEl = target.closest<HTMLElement>("[data-type='attachment']");
        if (attachmentEl) {
          event.preventDefault();
          event.stopPropagation();
          const targetPath =
            attachmentEl.getAttribute("data-file-path") ||
            attachmentEl.getAttribute("data-asset-src");
          if (targetPath) {
            const isReveal = target.closest("[data-action='reveal']");
            if (isReveal) {
              void ipcBridge.revealInExplorer(targetPath);
            } else {
              void ipcBridge.openFile(targetPath);
            }
            return true;
          }
        }

        // External link click -> open in default OS browser
        const extLink = target.closest<HTMLAnchorElement>("a.editor-external-link, a[href]");
        if (extLink && extLink.href) {
          // Block internal asset URLs from being opened in external web browser
          if (extLink.href.includes("asset.localhost")) {
            event.preventDefault();
            event.stopPropagation();
            return true;
          }
          event.preventDefault();
          event.stopPropagation();
          void ipcBridge.openExternalUrl(extLink.href);
          return true;
        }

        // Internal note link click
        const linkEl = target.closest<HTMLElement>("[data-internal-link='true']");
        if (linkEl) {
          const targetNoteId = linkEl.getAttribute("data-target-note-id");
          if (targetNoteId && onNavigateToNote) {
            event.preventDefault();
            event.stopPropagation();
            onNavigateToNote(targetNoteId);
            return true;
          }
        }
        return false;
      },
    },
    onFocus: ({ editor: ed }) => {
      if (onEditorFocus) {
        onEditorFocus();
      }
      const { from } = ed.state.selection;
      let activeId: string | null = null;
      ed.state.doc.nodesBetween(0, from, (node) => {
        if (node.type.name === "heading" && node.attrs?.id) {
          activeId = node.attrs.id as string;
        }
      });
      if (activeId) {
        useTocStore.getState().setActiveHeadingId(activeId);
      }
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from } = ed.state.selection;
      let activeId: string | null = null;
      ed.state.doc.nodesBetween(0, from, (node) => {
        if (node.type.name === "heading" && node.attrs?.id) {
          activeId = node.attrs.id as string;
        }
      });
      if (activeId) {
        useTocStore.getState().setActiveHeadingId(activeId);
      }
    },
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

  // Register editor navigator with Table of Contents for exact cursor navigation
  useEffect(() => {
    if (!editor) return;
    const key = editorContextKey || "default";
    const unregister = useTocStore.getState().registerEditorNavigator(key, (heading) => {
      let targetPos: number | null = null;
      let currentHeadingIdx = 0;
      let matchedByIdPos: number | null = null;
      let matchedByIndexPos: number | null = null;
      let matchedByTextAndLevelPos: number | null = null;

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          // 1. Match by unique block ID if genuine
          if (
            heading.id &&
            !heading.id.startsWith("heading-") &&
            node.attrs?.id === heading.id
          ) {
            matchedByIdPos = pos + 1;
          }

          // 2. Match by exact heading index (ordinal position in document)
          if (currentHeadingIdx === heading.index) {
            matchedByIndexPos = pos + 1;
          }

          // 3. Fallback match by text and heading level
          if (
            matchedByTextAndLevelPos === null &&
            node.textContent.trim() === heading.text.trim() &&
            node.attrs?.level === heading.level
          ) {
            matchedByTextAndLevelPos = pos + 1;
          }

          currentHeadingIdx++;
        }
        return true;
      });

      // Priority: matched by ID -> matched by document index -> matched by text & level
      targetPos = matchedByIdPos ?? matchedByIndexPos ?? matchedByTextAndLevelPos;

      if (targetPos !== null) {
        editor.chain().focus().setTextSelection(targetPos).scrollIntoView().run();
        return true;
      }
      return false;
    });

    return unregister;
  }, [editor, editorContextKey]);

  // Register editor navigator with Resource Inspector for exact cursor navigation
  useEffect(() => {
    if (!editor) return;
    const key = editorContextKey || "default";

    const unregisterResource = useResourceStore
      .getState()
      .registerEditorResourceNavigator(key, (item) => {
        let targetPos: number | null = null;
        let isNodeSelection = false;

        editor.state.doc.descendants((node, pos) => {
          if (targetPos !== null) return false;

          // 1. Match by genuine block ID
          if (
            item.blockId &&
            !item.blockId.startsWith("blk_gen_") &&
            node.attrs?.id === item.blockId
          ) {
            if (node.isTextblock) {
              targetPos = pos + 1;
            } else {
              targetPos = pos;
              isNodeSelection = true;
            }
            return false;
          }

          // 2. Resource-specific matching
          if (item.resourceType === "code") {
            if (node.type.name === "codeBlock" || node.type.name === "code") {
              const text = node.textContent.trim();
              const snippet = (item.snippet || item.title || "").trim();
              if (
                !snippet ||
                text.includes(snippet.slice(0, 30)) ||
                snippet.includes(text.slice(0, 30))
              ) {
                targetPos = pos + 1;
                return false;
              }
            }
          } else if (item.resourceType === "image") {
            if (node.type.name === "image") {
              const src =
                (node.attrs?.src as string) || (node.attrs?.filePath as string);
              if (
                item.targetUrl &&
                (src === item.targetUrl ||
                  src?.includes(item.targetUrl) ||
                  item.targetUrl.includes(src))
              ) {
                targetPos = pos;
                isNodeSelection = true;
                return false;
              }
              if (item.assetId && node.attrs?.assetId === item.assetId) {
                targetPos = pos;
                isNodeSelection = true;
                return false;
              }
              if (item.title && node.attrs?.alt === item.title) {
                targetPos = pos;
                isNodeSelection = true;
                return false;
              }
            }
          } else if (item.resourceType === "attachment") {
            if (
              node.type.name === "attachment" ||
              node.type.name === "fileAttachment"
            ) {
              const filePath =
                (node.attrs?.filePath as string) || (node.attrs?.src as string);
              if (
                item.targetUrl &&
                (filePath === item.targetUrl ||
                  filePath?.includes(item.targetUrl))
              ) {
                targetPos = pos;
                isNodeSelection = true;
                return false;
              }
              if (
                item.fileName &&
                (node.attrs?.fileName === item.fileName ||
                  node.attrs?.title === item.fileName)
              ) {
                targetPos = pos;
                isNodeSelection = true;
                return false;
              }
            }
          } else if (item.resourceType === "link") {
            if (node.isText && node.marks && node.marks.length > 0) {
              for (const mark of node.marks) {
                if (mark.type.name === "link") {
                  const href = mark.attrs?.href as string;
                  if (item.targetUrl && href === item.targetUrl) {
                    targetPos = pos;
                    return false;
                  }
                  if (item.title && node.text?.trim() === item.title.trim()) {
                    targetPos = pos;
                    return false;
                  }
                }
              }
            }
          } else if (item.resourceType === "backlink") {
            if (node.isText && node.marks && node.marks.length > 0) {
              for (const mark of node.marks) {
                if (mark.type.name === "internalLink") {
                  if (
                    item.targetNoteId &&
                    mark.attrs?.targetNoteId === item.targetNoteId
                  ) {
                    targetPos = pos;
                    return false;
                  }
                }
              }
            }
          }

          return true;
        });

        // 3. Fallback: match by synthetic block ID (blk_gen_X)
        if (
          targetPos === null &&
          item.blockId &&
          item.blockId.startsWith("blk_gen_")
        ) {
          const idx = parseInt(item.blockId.replace("blk_gen_", ""), 10);
          if (!isNaN(idx) && editor.state.doc.childCount > idx) {
            let currentOffset = 0;
            for (let c = 0; c < idx; c++) {
              currentOffset += editor.state.doc.child(c).nodeSize;
            }
            const targetChild = editor.state.doc.child(idx);
            if (targetChild.isTextblock) {
              targetPos = currentOffset + 1;
            } else {
              targetPos = currentOffset;
              isNodeSelection = true;
            }
          }
        }

        if (targetPos !== null) {
          if (isNodeSelection) {
            try {
              const tr = editor.state.tr.setSelection(
                NodeSelection.create(editor.state.doc, targetPos)
              );
              editor.view.dispatch(tr.scrollIntoView());
              editor.view.focus();
            } catch {
              editor
                .chain()
                .focus()
                .setTextSelection(targetPos)
                .scrollIntoView()
                .run();
            }
          } else {
            editor
              .chain()
              .focus()
              .setTextSelection(targetPos)
              .scrollIntoView()
              .run();
          }

          // Pulse highlight animation on DOM
          setTimeout(() => {
            let targetEl: HTMLElement | null = null;
            if (item.blockId && !item.blockId.startsWith("blk_gen_")) {
              targetEl = document.querySelector(
                `[data-block-id="${item.blockId}"]`
              );
            }
            if (!targetEl) {
              const domAtPos = editor.view.nodeDOM(
                targetPos!
              ) as HTMLElement | null;
              targetEl =
                domAtPos?.nodeType === 1
                  ? domAtPos
                  : domAtPos?.parentElement || null;
            }
            if (targetEl) {
              targetEl.classList.remove("block-highlight-pulse");
              void targetEl.offsetWidth;
              targetEl.classList.add("block-highlight-pulse");
              setTimeout(
                () => targetEl?.classList.remove("block-highlight-pulse"),
                2600
              );
            }
          }, 50);

          return true;
        }
        return false;
      });

    // Check if there is a pending jump for this editor context
    const pending = useResourceStore.getState().pendingResourceJump;
    if (pending) {
      const targetKey =
        pending.parentDocumentType === "dsm" && pending.entryDate
          ? `dsm_${pending.entryDate}`
          : `general_${pending.parentDocumentId}`;
      if (
        key === targetKey ||
        key === pending.parentDocumentId ||
        key.includes(pending.parentDocumentId)
      ) {
        setTimeout(() => {
          useResourceStore.getState().scrollToResource(pending);
          useResourceStore.getState().setPendingResourceJump(null);
        }, 80);
      }
    }

    return unregisterResource;
  }, [editor, editorContextKey]);

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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (
      e.dataTransfer.types.includes("application/x-chronote-note") ||
      e.dataTransfer.types.includes("Files")
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!isDragOver) setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleContainerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragOver(false);
    if (e.defaultPrevented || !editor) return;

    // Handle dropped files onto container padding
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      for (const file of Array.from(e.dataTransfer.files)) {
        void processFileAsset(file).then((asset) => {
          const docEnd = editor.state.doc.content.size;
          if (asset.isImage) {
            editor
              .chain()
              .focus()
              .insertContentAt(docEnd, {
                type: "image",
                attrs: {
                  src: asset.src,
                  alt: asset.fileName,
                  assetId: asset.assetId,
                  title: asset.fileName,
                },
              })
              .run();
          } else {
            editor
              .chain()
              .focus()
              .insertContentAt(docEnd, {
                type: "attachment",
                attrs: {
                  src: asset.src,
                  fileName: asset.fileName,
                  fileSize: asset.fileSize,
                  mimeType: asset.mimeType,
                  assetId: asset.assetId,
                },
              })
              .run();
          }
        });
      }
      return;
    }

    const rawNoteData = e.dataTransfer.getData("application/x-chronote-note");
    if (rawNoteData) {
      try {
        const { id, title } = JSON.parse(rawNoteData);
        if (id && title) {
          e.preventDefault();
          const docEnd = editor.state.doc.content.size;
          editor
            .chain()
            .focus()
            .insertContentAt(docEnd, [
              {
                type: "text",
                text: title,
                marks: [
                  {
                    type: "internalLink",
                    attrs: {
                      targetNoteId: id,
                      originalTitle: title,
                    },
                  },
                ],
              },
              {
                type: "text",
                text: " ",
              },
            ])
            .run();
        }
      } catch (err) {
        console.error("Failed to parse dropped note data:", err);
      }
    }
  };

  return (
    <div
      className={`chronote-editor-container ${className} ${isDragOver ? "is-drag-over" : ""}`}
      onClick={handleEditorClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleContainerDrop}
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
