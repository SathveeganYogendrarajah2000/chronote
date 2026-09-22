import { Node, mergeAttributes } from "@tiptap/core";

export interface ImageOptions {
  inline?: boolean;
  HTMLAttributes?: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customImage: {
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        assetId?: string;
        width?: number | string;
        id?: string;
      }) => ReturnType;
    };
  }
}

export const CustomImage = Node.create<ImageOptions>({
  name: "image",
  group: "block",
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      assetId: { default: null },
      width: { default: null },
      id: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { alt, ...imgAttrs } = HTMLAttributes;
    return [
      "div",
      { class: "chronote-image-wrapper" },
      ["img", mergeAttributes(this.options.HTMLAttributes ?? {}, imgAttrs, { class: "chronote-image" })],
      alt ? ["div", { class: "chronote-image-caption" }, alt] : null,
    ];
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
