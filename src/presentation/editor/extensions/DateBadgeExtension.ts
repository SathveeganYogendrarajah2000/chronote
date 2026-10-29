import { Node, mergeAttributes, InputRule } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { DateBadgeView } from "../components/DateBadgeView";

export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getTomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dateBadge: {
      insertDateBadge: (attributes?: { date?: string }) => ReturnType;
    };
  }
}

export const DateBadge = Node.create({
  name: "dateBadge",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      date: {
        default: () => getTodayDateString(),
        parseHTML: (element) => element.getAttribute("data-date") || getTodayDateString(),
        renderHTML: (attributes) => ({
          "data-date": attributes.date,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="date-badge"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "date-badge",
        class: "chronote-date-badge",
      }),
      `📅 ${HTMLAttributes["data-date"] || ""}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DateBadgeView);
  },

  addCommands() {
    return {
      insertDateBadge:
        (attributes) =>
        ({ chain }) => {
          const targetDate = attributes?.date || getTodayDateString();
          return chain()
            .insertContent([
              {
                type: this.name,
                attrs: { date: targetDate },
              },
              {
                type: "text",
                text: " ",
              },
            ])
            .run();
        },
    };
  },

  addInputRules() {
    return [
      // /date-today or @today
      new InputRule({
        find: /(?:^|\s)(?:\/date-today|@today)$/,
        handler: ({ chain, range, match }) => {
          const start = range.from + (match[0].startsWith(" ") ? 1 : 0);
          chain()
            .focus()
            .deleteRange({ from: start, to: range.to })
            .insertContentAt(start, [
              {
                type: this.name,
                attrs: { date: getTodayDateString() },
              },
              { type: "text", text: " " },
            ])
            .run();
        },
      }),
      // /date-tmrw or @tomorrow
      new InputRule({
        find: /(?:^|\s)(?:\/date-tmrw|@tomorrow)$/,
        handler: ({ chain, range, match }) => {
          const start = range.from + (match[0].startsWith(" ") ? 1 : 0);
          chain()
            .focus()
            .deleteRange({ from: start, to: range.to })
            .insertContentAt(start, [
              {
                type: this.name,
                attrs: { date: getTomorrowDateString() },
              },
              { type: "text", text: " " },
            ])
            .run();
        },
      }),
      // /date-yesterday or @yesterday
      new InputRule({
        find: /(?:^|\s)(?:\/date-yesterday|@yesterday)$/,
        handler: ({ chain, range, match }) => {
          const start = range.from + (match[0].startsWith(" ") ? 1 : 0);
          chain()
            .focus()
            .deleteRange({ from: start, to: range.to })
            .insertContentAt(start, [
              {
                type: this.name,
                attrs: { date: getYesterdayDateString() },
              },
              { type: "text", text: " " },
            ])
            .run();
        },
      }),
    ];
  },
});

