import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    attachment: {
      setAttachment: (options: {
        src: string;
        fileName: string;
        fileSize?: number;
        mimeType?: string;
        assetId?: string;
        id?: string;
      }) => ReturnType;
    };
  }
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const AttachmentExtension = Node.create({
  name: "attachment",
  group: "block",
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: { default: "" },
      fileName: { default: "Attachment" },
      fileSize: { default: 0 },
      mimeType: { default: "application/octet-stream" },
      assetId: { default: null },
      id: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="attachment"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const sizeStr = formatBytes(HTMLAttributes.fileSize);
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "attachment",
        class: "chronote-attachment-card",
        "data-asset-src": HTMLAttributes.src || "",
        "data-file-name": HTMLAttributes.fileName || "",
      }),
      [
        "div",
        { class: "attachment-icon-badge" },
        "📎",
      ],
      [
        "div",
        { class: "attachment-details" },
        [
          "span",
          { class: "attachment-name" },
          HTMLAttributes.fileName || "Attached file",
        ],
        sizeStr ? ["span", { class: "attachment-size" }, sizeStr] : null,
      ],
    ];
  },

  addCommands() {
    return {
      setAttachment:
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
