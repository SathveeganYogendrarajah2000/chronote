import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { parseInternalLinkText, getInternalLinkDisplayText } from "@domain/internalLink.utils";
import type { LinkCandidate } from "../components/InternalLinkPopover";

export interface InternalLinkSuggestionOptions {
  getCandidates: () => LinkCandidate[];
  onOpen?: ((state: {
    items: LinkCandidate[];
    selectedIndex: number;
    coords: { top: number; left: number };
    onSelect: (item: LinkCandidate) => void;
  }) => void) | undefined;
  onClose?: (() => void) | undefined;
}

export const InternalLinkSuggestion = Extension.create<InternalLinkSuggestionOptions>({
  name: "internalLinkSuggestion",

  addOptions() {
    return {
      getCandidates: () => [],
      onOpen: undefined,
      onClose: undefined,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "[[",
        allowSpaces: true,
        startOfLine: false,

        findSuggestionMatch: (config) => {
          const { $position } = config;
          const textBefore = $position.parent.textBetween(
            Math.max(0, $position.parentOffset - 80),
            $position.parentOffset,
            undefined,
            "\ufffc"
          );

          const regex = /(?:^|\s)\[\[([^\]]*)$/;
          const match = regex.exec(textBefore);

          if (!match) {
            return null;
          }

          const query = match[1];
          const matchStart = $position.pos - query.length - 2;
          const matchEnd = $position.pos;

          return {
            range: {
              from: matchStart,
              to: matchEnd,
            },
            query,
            text: match[0],
          };
        },

        items: ({ query }) => {
          const all = this.options.getCandidates();
          const parsed = parseInternalLinkText(query);
          const targetSearch = (parsed ? parsed.targetTitle : query).toLowerCase().trim();

          if (!targetSearch) {
            return all.slice(0, 8);
          }

          return all
            .filter((c) => {
              const titleMatch = c.title.toLowerCase().includes(targetSearch);
              const tagMatch = c.tags?.some((t) => t.toLowerCase().includes(targetSearch));
              return titleMatch || tagMatch;
            })
            .slice(0, 8);
        },

        render: () => {
          let selectedIndex = 0;
          let currentItems: LinkCandidate[] = [];
          let commandFn: ((item: LinkCandidate) => void) | null = null;
          let lastCoords: { top: number; left: number } = { top: 0, left: 0 };

          const notifyOpen = () => {
            if (this.options.onOpen && commandFn) {
              this.options.onOpen({
                items: currentItems,
                selectedIndex,
                coords: lastCoords,
                onSelect: (item) => commandFn?.(item),
              });
            }
          };

          return {
            onStart: (props) => {
              selectedIndex = 0;
              currentItems = props.items as LinkCandidate[];
              commandFn = props.command as (item: LinkCandidate) => void;

              const client = props.clientRect?.();
              if (client) {
                lastCoords = { top: client.bottom, left: client.left };
              }
              notifyOpen();
            },

            onUpdate: (props) => {
              currentItems = props.items as LinkCandidate[];
              commandFn = props.command as (item: LinkCandidate) => void;
              if (selectedIndex >= currentItems.length) {
                selectedIndex = Math.max(0, currentItems.length - 1);
              }

              const client = props.clientRect?.();
              if (client) {
                lastCoords = { top: client.bottom, left: client.left };
              }
              notifyOpen();
            },

            onKeyDown: (props) => {
              if (props.event.key === "ArrowDown") {
                selectedIndex = (selectedIndex + 1) % Math.max(1, currentItems.length);
                notifyOpen();
                return true;
              }

              if (props.event.key === "ArrowUp") {
                selectedIndex =
                  (selectedIndex - 1 + currentItems.length) % Math.max(1, currentItems.length);
                notifyOpen();
                return true;
              }

              if (props.event.key === "Enter") {
                const item = currentItems[selectedIndex];
                if (item && commandFn) {
                  commandFn(item);
                  return true;
                }
              }

              if (props.event.key === "Escape") {
                if (this.options.onClose) this.options.onClose();
                return true;
              }

              return false;
            },

            onExit: () => {
              if (this.options.onClose) {
                this.options.onClose();
              }
            },
          };
        },

        command: ({ editor, range, props }) => {
          const item = props as LinkCandidate;
          const textInDoc = editor.state.doc.textBetween(range.from, range.to);
          const rawMatch = /\[\[(.*)/.exec(textInDoc);
          const parsed = parseInternalLinkText(rawMatch ? rawMatch[1] : "");
          const displayText = getInternalLinkDisplayText(item.title, parsed?.alias);

          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: "text",
                text: displayText,
                marks: [
                  {
                    type: "internalLink",
                    attrs: {
                      targetNoteId: item.id,
                      originalTitle: item.title,
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
        },
      }),
    ];
  },
});
