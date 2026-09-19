import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import type { SlashCommandItem } from "../components/SlashCommandMenu";

export const SlashCommandPluginKey = new PluginKey("slashCommand");

export interface SlashCommandOptions {
  onOpen?: ((state: {
    items: SlashCommandItem[];
    selectedIndex: number;
    coords: { top: number; left: number };
    onSelect: (item: SlashCommandItem) => void;
  }) => void) | undefined;
  onClose?: (() => void) | undefined;
}

const COMMAND_ITEMS: SlashCommandItem[] = [
  {
    id: "h1",
    title: "Heading 1",
    description: "Large section heading",
    icon: "H1",
  },
  {
    id: "h2",
    title: "Heading 2",
    description: "Medium section heading",
    icon: "H2",
  },
  {
    id: "h3",
    title: "Heading 3",
    description: "Sub-section heading",
    icon: "H3",
  },
  {
    id: "code",
    title: "Code Block",
    description: "Syntax highlighted code snippet with language selector",
    icon: "</>",
  },
  {
    id: "bullet",
    title: "Bullet List",
    description: "Unordered list of items",
    icon: "•",
  },
  {
    id: "numbered",
    title: "Numbered List",
    description: "Sequential ordered list",
    icon: "1.",
  },
  {
    id: "todo",
    title: "Task List",
    description: "Interactive checklist with checkboxes",
    icon: "[ ]",
  },
  {
    id: "quote",
    title: "Blockquote",
    description: "Quote or callout block",
    icon: "”",
  },
  {
    id: "divider",
    title: "Divider",
    description: "Horizontal rule separator",
    icon: "—",
  },
];

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return {
      onOpen: undefined,
      onClose: undefined,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: SlashCommandPluginKey,
        editor: this.editor,
        char: "/",
        startOfLine: false,

        items: ({ query }) => {
          const q = query.toLowerCase().trim();
          if (!q) return COMMAND_ITEMS;
          return COMMAND_ITEMS.filter(
            (item) =>
              item.id.toLowerCase().includes(q) ||
              item.title.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q)
          );
        },

        render: () => {
          let selectedIndex = 0;
          let currentItems: SlashCommandItem[] = [];
          let commandFn: ((item: SlashCommandItem) => void) | null = null;
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
              currentItems = props.items as SlashCommandItem[];
              commandFn = props.command as (item: SlashCommandItem) => void;

              const client = props.clientRect?.();
              if (client) {
                lastCoords = { top: client.bottom, left: client.left };
              }
              notifyOpen();
            },

            onUpdate: (props) => {
              currentItems = props.items as SlashCommandItem[];
              commandFn = props.command as (item: SlashCommandItem) => void;
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
          const item = props as SlashCommandItem;
          const chain = editor.chain().focus().deleteRange(range);

          switch (item.id) {
            case "h1":
              chain.setHeading({ level: 1 }).run();
              break;
            case "h2":
              chain.setHeading({ level: 2 }).run();
              break;
            case "h3":
              chain.setHeading({ level: 3 }).run();
              break;
            case "code":
              chain.setCodeBlock().run();
              break;
            case "bullet":
              chain.toggleBulletList().run();
              break;
            case "numbered":
              chain.toggleOrderedList().run();
              break;
            case "todo":
              chain.toggleTaskList().run();
              break;
            case "quote":
              chain.toggleBlockquote().run();
              break;
            case "divider":
              chain.setHorizontalRule().run();
              break;
            default:
              chain.run();
          }
        },
      }),
    ];
  },
});
