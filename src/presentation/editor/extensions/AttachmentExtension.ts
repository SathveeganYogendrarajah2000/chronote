import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    attachment: {
      setAttachment: (options: {
        src: string;
        filePath?: string;
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
      filePath: { default: "" },
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
    const targetPath = HTMLAttributes.filePath || HTMLAttributes.src || "";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "attachment",
        "data-block-id": HTMLAttributes.id || HTMLAttributes["data-block-id"],
        class: "chronote-attachment-card",
        "data-file-path": targetPath,
        "data-asset-src": HTMLAttributes.src || "",
        "data-file-name": HTMLAttributes.fileName || "",
        title: `Click to open ${HTMLAttributes.fileName || "file"} (or click 📁 to reveal in Explorer)`,
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
      [
        "button",
        {
          type: "button",
          class: "attachment-reveal-btn",
          "data-action": "reveal",
          title: "Reveal file in Explorer",
        },
        "📁",
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
