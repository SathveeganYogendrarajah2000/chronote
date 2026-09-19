import { Mark, mergeAttributes } from "@tiptap/core";

export interface InternalLinkOptions {
  HTMLAttributes: Record<string, unknown>;
  onNavigate?: ((targetNoteId: string) => void) | undefined;
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
});
