import type { ProseMirrorNode } from "./document.types";
import type { ResourceReference, BacklinkReference } from "./resource.types";

interface ExtractionContext {
  parentDocumentId: string;
  parentDocumentType: "dsm" | "general";
  parentDocumentTitle: string;
  entryId?: string | undefined;
  entryDate?: string | undefined;
}

/**
 * Extracts resources (code, images, links, internal links) and backlinks from a ProseMirror document.
 */
export function extractResourcesFromDoc(
  doc: ProseMirrorNode | null | undefined,
  context: ExtractionContext
): { resources: ResourceReference[]; backlinks: BacklinkReference[] } {
  const resources: ResourceReference[] = [];
  const backlinks: BacklinkReference[] = [];

  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    return { resources, backlinks };
  }

  for (let i = 0; i < doc.content.length; i++) {
    const block = doc.content[i];
    if (!block) continue;

    const blockId = (block.attrs?.id as string) || `blk_gen_${i}`;

    // 1. Code block
    if (block.type === "codeBlock" || block.type === "code") {
      let codeText = "";
      if (block.content && Array.isArray(block.content)) {
        for (const child of block.content) {
          if (child.text) codeText += child.text;
        }
      }
      const lang = (block.attrs?.language as string) || "plaintext";
      const snippetPreview = codeText.trim().split("\n")[0]?.slice(0, 80) || "Code snippet";

      resources.push({
        id: `res_code_${blockId}`,
        resourceType: "code",
        parentDocumentId: context.parentDocumentId,
        parentDocumentType: context.parentDocumentType,
        entryId: context.entryId,
        entryDate: context.entryDate,
        blockId,
        title: snippetPreview,
        snippet: codeText,
        language: lang,
      });
    }

    // 2. Image block
    else if (block.type === "image") {
      const src = (block.attrs?.src as string) || "";
      const alt = (block.attrs?.alt as string) || "Screenshot";

      resources.push({
        id: `res_img_${blockId}`,
        resourceType: "image",
        parentDocumentId: context.parentDocumentId,
        parentDocumentType: context.parentDocumentType,
        entryId: context.entryId,
        entryDate: context.entryDate,
        blockId,
        title: alt,
        targetUrl: src,
      });
    }

    // 3. Inspect child inline nodes for links and internal links
    if (block.content && Array.isArray(block.content)) {
      for (let j = 0; j < block.content.length; j++) {
        const inline = block.content[j];
        if (!inline || !inline.marks || !Array.isArray(inline.marks)) continue;

        for (const mark of inline.marks) {
          // External link
          if (mark.type === "link" && mark.attrs?.href) {
            const href = mark.attrs.href as string;
            const text = inline.text?.trim() || href;

            resources.push({
              id: `res_link_${blockId}_${j}`,
              resourceType: "link",
              parentDocumentId: context.parentDocumentId,
              parentDocumentType: context.parentDocumentType,
              entryId: context.entryId,
              entryDate: context.entryDate,
              blockId,
              title: text,
              targetUrl: href,
            });
          }

          // Internal note link
          if (mark.type === "internalLink" && mark.attrs?.targetNoteId) {
            const targetNoteId = mark.attrs.targetNoteId as string;
            const title = (mark.attrs.originalTitle as string) || inline.text?.trim() || "Note";

            resources.push({
              id: `res_inlink_${blockId}_${j}`,
              resourceType: "backlink",
              parentDocumentId: context.parentDocumentId,
              parentDocumentType: context.parentDocumentType,
              entryId: context.entryId,
              entryDate: context.entryDate,
              blockId,
              title,
              targetNoteId,
            });

            backlinks.push({
              sourceDocumentId: context.parentDocumentId,
              sourceDocumentType: context.parentDocumentType,
              sourceDocumentTitle: context.parentDocumentTitle,
              sourceEntryId: context.entryId,
              sourceEntryDate: context.entryDate,
              targetNoteId,
            });
          }
        }
      }
    }
  }

  return { resources, backlinks };
}
