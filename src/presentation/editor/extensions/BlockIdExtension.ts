import { Extension } from "@tiptap/core";
import { generateId } from "@domain/id.utils";

export const BlockId = Extension.create({
  name: "blockId",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "blockquote", "taskItem"],
        attributes: {
          id: {
            default: () => generateId("blk"),
            parseHTML: (element) =>
              element.getAttribute("data-block-id") || generateId("blk"),
            renderHTML: (attributes) => {
              if (!attributes.id) return {};
              return {
                "data-block-id": attributes.id as string,
              };
            },
          },
        },
      },
    ];
  },
});
