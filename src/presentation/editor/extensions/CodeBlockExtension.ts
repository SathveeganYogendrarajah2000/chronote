import { ReactNodeViewRenderer } from "@tiptap/react";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import { generateId } from "@domain/id.utils";
import { CodeBlockView } from "../components/CodeBlockView";

// Initialize lowlight engine with 35+ common engineering languages
export const lowlight = createLowlight(common);

export const CustomCodeBlock = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: () => generateId("blk"),
        parseHTML: (element) => element.getAttribute("data-block-id") || generateId("blk"),
        renderHTML: (attributes) => ({
          "data-block-id": attributes.id as string,
        }),
      },
      language: {
        default: "plaintext",
        parseHTML: (element) => {
          const match = /language-(\w+)/.exec(element.className || "");
          return match ? match[1] : "plaintext";
        },
        renderHTML: (attributes) => ({
          class: `language-${attributes.language}`,
        }),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({
  lowlight,
  defaultLanguage: "plaintext",
});
