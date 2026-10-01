import type { ProseMirrorNode } from "./document.types";

export interface TocHeadingItem {
  id: string;
  level: number;
  text: string;
  index: number;
}

/**
 * Extracts plain text from a ProseMirror node and its descendants.
 */
function extractNodeText(node: ProseMirrorNode): string {
  if (node.text) {
    return node.text;
  }
  if (!node.content || !Array.isArray(node.content)) {
    return "";
  }
  return node.content.map(extractNodeText).join("");
}

/**
 * Extracts all heading nodes (h1, h2, h3, etc.) from a ProseMirror document tree in order.
 */
export function extractHeadings(doc: ProseMirrorNode | null | undefined): TocHeadingItem[] {
  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    return [];
  }

  const headings: TocHeadingItem[] = [];
  let headingCounter = 0;

  function traverse(node: ProseMirrorNode) {
    if (node.type === "heading") {
      const level = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      const text = extractNodeText(node).trim() || `Untitled Heading ${headingCounter + 1}`;
      const id = (node.attrs?.id as string) || `heading-${headingCounter}`;

      headings.push({
        id,
        level,
        text,
        index: headingCounter,
      });

      headingCounter++;
    }

    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child);
      }
    }
  }

  traverse(doc);
  return headings;
}
