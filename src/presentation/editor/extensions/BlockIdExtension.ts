import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { generateId } from "@domain/id.utils";

const TARGET_NODE_TYPES = ["paragraph", "heading", "blockquote", "taskItem"];

export const BlockId = Extension.create({
  name: "blockId",

  addGlobalAttributes() {
    return [
      {
        types: TARGET_NODE_TYPES,
        attributes: {
          id: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute("data-block-id") || null,
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

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blockIdPlugin"),
        appendTransaction(transactions, _oldState, newState) {
          // Only check when document content actually changed
          if (!transactions.some((tr) => tr.docChanged)) return null;

          let tr = newState.tr;
          let modified = false;
          const seen = new Set<string>();

          newState.doc.descendants((node, pos) => {
            if (TARGET_NODE_TYPES.includes(node.type.name)) {
              const currentId = node.attrs.id as string | undefined;
              if (!currentId || seen.has(currentId)) {
                const newId = generateId("blk");
                tr = tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  id: newId,
                });
                seen.add(newId);
                modified = true;
              } else {
                seen.add(currentId);
              }
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});

