import { Node, mergeAttributes } from "@tiptap/core";
import { toAssetUrl } from "@infrastructure/tauri/assetHelper";

export interface ImageOptions {
  inline?: boolean;
  HTMLAttributes?: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customImage: {
      setImage: (options: {
        src: string;
        filePath?: string;
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
      filePath: { default: null },
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
    const targetSrc = toAssetUrl(imgAttrs.src || HTMLAttributes.filePath);
    return [
      "div",
      { class: "chronote-image-wrapper" },
      [
        "img",
        mergeAttributes(this.options.HTMLAttributes ?? {}, imgAttrs, {
          src: targetSrc,
          class: "chronote-image",
          loading: "lazy",
        }),
      ],
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
