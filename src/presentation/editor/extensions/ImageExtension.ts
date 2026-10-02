import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { toAssetUrl } from "@infrastructure/tauri/assetHelper";
import { ImageView } from "../components/ImageView";

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
        align?: "left" | "center" | "right";
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
      align: { default: "center" },
      id: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-type='image']",
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          const el = element as HTMLElement;
          const img = el.querySelector("img");
          return {
            src: img?.getAttribute("src") || null,
            alt: img?.getAttribute("alt") || null,
            width: el.style.width || el.getAttribute("data-width") || null,
            align: el.getAttribute("data-align") || "center",
          };
        },
      },
      {
        tag: "img[src]",
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          const el = element as HTMLElement;
          return {
            src: el.getAttribute("src"),
            alt: el.getAttribute("alt"),
            width: el.getAttribute("width") || el.style.width || null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { alt, align, width, ...imgAttrs } = HTMLAttributes;
    const targetSrc = toAssetUrl(imgAttrs.src || HTMLAttributes.filePath);
    const widthStyle = width ? `width: ${width}; max-width: 100%;` : "max-width: 100%;";
    const alignClass = align ? `align-${align}` : "align-center";

    return [
      "figure",
      {
        class: `chronote-image-wrapper ${alignClass}`,
        "data-type": "image",
        "data-align": align || "center",
        "data-width": width || "",
        style: widthStyle,
      },
      [
        "img",
        mergeAttributes(this.options.HTMLAttributes ?? {}, imgAttrs, {
          src: targetSrc,
          class: "chronote-image",
          loading: "lazy",
        }),
      ],
      alt ? ["figcaption", { class: "chronote-image-caption" }, alt] : null,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
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

