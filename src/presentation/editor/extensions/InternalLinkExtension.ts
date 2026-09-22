import { Mark, mergeAttributes, InputRule } from "@tiptap/core";

export interface InternalLinkCandidate {
  id: string;
  title: string;
  tags?: string[] | undefined;
}

export interface InternalLinkOptions {
  HTMLAttributes: Record<string, unknown>;
  onNavigate?: ((targetNoteId: string) => void) | undefined;
  getCandidates?: (() => InternalLinkCandidate[]) | undefined;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    internalLink: {
      setInternalLink: (attributes: {
        targetNoteId: string;
        originalTitle: string;
      }) => ReturnType;
      unsetInternalLink: () => ReturnType;
    };
  }
}

export const InternalLink = Mark.create<InternalLinkOptions>({
  name: "internalLink",
  priority: 1000,
  keepOnSplit: false,
  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {},
      onNavigate: undefined,
      getCandidates: undefined,
    };
  },

  addAttributes() {
    return {
      targetNoteId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-target-note-id"),
        renderHTML: (attributes) => ({
          "data-target-note-id": attributes.targetNoteId as string,
        }),
      },
      originalTitle: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-original-title"),
        renderHTML: (attributes) => ({
          "data-original-title": attributes.originalTitle as string,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-internal-link="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          "data-internal-link": "true",
          class: "internal-link",
        }
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setInternalLink:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      unsetInternalLink:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|\s)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/,
        handler: ({ chain, range, match }) => {
          const rawTarget = match[1]?.trim();
          if (!rawTarget) return null;
          const alias = match[2]?.trim();

          const candidates = this.options.getCandidates?.() || [];
          const candidate = candidates.find(
            (c) =>
              c.title.toLowerCase() === rawTarget.toLowerCase() ||
              c.id.toLowerCase() === rawTarget.toLowerCase()
          );

          const targetNoteId = candidate ? candidate.id : rawTarget;
          const originalTitle = candidate ? candidate.title : rawTarget;
          const displayText = alias || originalTitle;

          const start = range.from + (match[0].startsWith(" ") ? 1 : 0);
          const end = range.to;

          chain()
            .focus()
            .deleteRange({ from: start, to: end })
            .insertContentAt(start, [
              {
                type: "text",
                text: displayText,
                marks: [
                  {
                    type: this.name,
                    attrs: {
                      targetNoteId,
                      originalTitle,
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
