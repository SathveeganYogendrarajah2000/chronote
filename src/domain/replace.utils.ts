import type { ProseMirrorNode } from "./document.types";

/**
 * Replaces occurrences of a search string within all text nodes of a ProseMirror JSON tree.
 * Preserves all node attributes (such as block IDs) and formatting marks.
 */
export function replaceTextInProseMirrorDoc(
  doc: ProseMirrorNode,
  search: string,
  replacement: string,
  caseSensitive: boolean = false
): { updatedDoc: ProseMirrorNode; matchCount: number } {
  if (!doc || !search) {
    return { updatedDoc: doc, matchCount: 0 };
  }

  let matchCount = 0;

  function processNode(node: ProseMirrorNode): ProseMirrorNode {
    if (node.type === "text" && typeof node.text === "string") {
      const original = node.text;
      let replaced = "";
      let count = 0;

      if (caseSensitive) {
        if (original.includes(search)) {
          const parts = original.split(search);
          count = parts.length - 1;
          replaced = parts.join(replacement);
        } else {
          return node;
        }
      } else {
        const lowerOriginal = original.toLowerCase();
        const lowerSearch = search.toLowerCase();
        if (lowerOriginal.includes(lowerSearch)) {
          let pos = 0;
          let idx = lowerOriginal.indexOf(lowerSearch, pos);
          while (idx !== -1) {
            count++;
            replaced += original.slice(pos, idx) + replacement;
            pos = idx + search.length;
            idx = lowerOriginal.indexOf(lowerSearch, pos);
          }
          replaced += original.slice(pos);
        } else {
          return node;
        }
      }

      if (count > 0) {
        matchCount += count;
        return {
          ...node,
          text: replaced,
        };
      }
      return node;
    }

    if (node.content && Array.isArray(node.content)) {
      const updatedChildren = node.content.map(processNode);
      return {
        ...node,
        content: updatedChildren,
      };
    }

    return node;
  }

  const updatedDoc = processNode(doc);
  return { updatedDoc, matchCount };
}

