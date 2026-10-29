import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import { toAssetUrl } from "@infrastructure/tauri/assetHelper";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";
import type { SlashCommandItem } from "../components/SlashCommandMenu";
import {
  getTodayDateString,
  getTomorrowDateString,
  getYesterdayDateString,
} from "./DateBadgeExtension";

export const SlashCommandPluginKey = new PluginKey("slashCommand");

export interface SlashCommandOptions {
  onOpen?: ((state: {
    items: SlashCommandItem[];
    selectedIndex: number;
    coords: { top: number; left: number };
    onSelect: (item: SlashCommandItem) => void;
  }) => void) | undefined;
  onClose?: (() => void) | undefined;
  onOpenCsvModal?: (() => void) | undefined;
}

const COMMAND_ITEMS: SlashCommandItem[] = [
  {
    id: "date-today",
    title: "Date (Today)",
    description: "Insert today's date badge (/date-today, /date)",
    icon: "📅",
  },
  {
    id: "date-tmrw",
    title: "Date (Tomorrow)",
    description: "Insert tomorrow's date badge (/date-tmrw)",
    icon: "📅",
  },
  {
    id: "date-yesterday",
    title: "Date (Yesterday)",
    description: "Insert yesterday's date badge (/date-yesterday)",
    icon: "📅",
  },
  {
    id: "date",
    title: "Date Badge",
    description: "Insert an interactive date block with picker (/date)",
    icon: "📅",
  },
  {
    id: "table",
    title: "Table",
    description: "Insert a 3x3 table with header row",
    icon: "⊞",
  },
  {
    id: "table-csv",
    title: "Table from CSV / Delimited",
    description: "Create table from CSV, TSV, pipe, or custom delimited text",
    icon: "📊",
  },
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
    id: "image",
    title: "Insert Image",
    description: "Upload or insert an image from your computer",
    icon: "🖼️",
  },
  {
    id: "file",
    title: "Attach File",
    description: "Attach a PDF, archive, document, or data file",
    icon: "📎",
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
          return COMMAND_ITEMS.filter((item) => {
            const matchesId = item.id.toLowerCase().includes(q);
            const matchesTitle = item.title.toLowerCase().includes(q);
            const matchesDesc = item.description.toLowerCase().includes(q);

            // Aliases for date commands
            if (q.startsWith("date") || q === "today" || q === "tomorrow" || q === "yesterday") {
              if (item.id.startsWith("date")) return true;
            }

            return matchesId || matchesTitle || matchesDesc;
          });
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
            case "date":
            case "date-today":
              chain
                .insertContent([
                  { type: "dateBadge", attrs: { date: getTodayDateString() } },
                  { type: "text", text: " " },
                ])
                .run();
              break;
            case "date-tmrw":
              chain
                .insertContent([
                  { type: "dateBadge", attrs: { date: getTomorrowDateString() } },
                  { type: "text", text: " " },
                ])
                .run();
              break;
            case "date-yesterday":
              chain
                .insertContent([
                  { type: "dateBadge", attrs: { date: getYesterdayDateString() } },
                  { type: "text", text: " " },
                ])
                .run();
              break;
            case "table":
              (chain as any).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
              break;
            case "table-csv":
              chain.run();
              if (this.options.onOpenCsvModal) {
                this.options.onOpenCsvModal();
              }
              break;
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
            case "image":
              chain.run();
              void ipcBridge.pickAssetFile("image").then((asset) => {
                if (asset) {
                  const rawPath = asset.absolutePath || asset.relativePath;
                  const src = toAssetUrl(rawPath);
                  (editor.chain().focus() as any).setImage({
                    src,
                    filePath: rawPath,
                    alt: asset.fileName,
                    assetId: asset.id,
                    title: asset.fileName,
                  }).run();
                }
              });
              break;
            case "file":
              chain.run();
              void ipcBridge.pickAssetFile("file").then((asset) => {
                if (asset) {
                  const rawPath = asset.absolutePath || asset.relativePath;
                  const src = toAssetUrl(rawPath);
                  (editor.chain().focus() as any).setAttachment({
                    src,
                    filePath: rawPath,
                    fileName: asset.fileName,
                    fileSize: asset.fileSize,
                    mimeType: asset.mimeType,
                    assetId: asset.id,
                  }).run();
                }
              });
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
