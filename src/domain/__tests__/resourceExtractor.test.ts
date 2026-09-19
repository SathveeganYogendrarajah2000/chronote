import { describe, it, expect } from "vitest";
import { extractResourcesFromDoc } from "../resourceExtractor";
import type { ProseMirrorNode } from "../document.types";

describe("resourceExtractor", () => {
  it("extracts code blocks, external links, and internal links", () => {
    const doc: ProseMirrorNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { id: "blk_p1" },
          content: [
            { type: "text", text: "Check out " },
            {
              type: "text",
              text: "Tauri Documentation",
              marks: [{ type: "link", attrs: { href: "https://tauri.app" } }],
            },
            { type: "text", text: " and see " },
            {
              type: "text",
              text: "Architecture Spec",
              marks: [
                {
                  type: "internalLink",
                  attrs: { targetNoteId: "not_arch1", originalTitle: "Architecture Spec" },
                },
              ],
            },
          ],
        },
        {
          type: "codeBlock",
          attrs: { id: "blk_c1", language: "rust" },
          content: [{ type: "text", text: "fn main() {\n  println!(\"hello\");\n}" }],
        },
        {
          type: "image",
          attrs: { id: "blk_img1", src: "assets/diagram.png", alt: "Architecture Diagram" },
        },
      ],
    };

    const { resources, backlinks } = extractResourcesFromDoc(doc, {
      parentDocumentId: "not_main",
      parentDocumentType: "general",
      parentDocumentTitle: "Main Note",
    });

    // Verify code block resource
    const codeRes = resources.find((r) => r.resourceType === "code");
    expect(codeRes).toBeDefined();
    expect(codeRes?.language).toBe("rust");
    expect(codeRes?.blockId).toBe("blk_c1");

    // Verify external link resource
    const linkRes = resources.find((r) => r.resourceType === "link");
    expect(linkRes).toBeDefined();
    expect(linkRes?.targetUrl).toBe("https://tauri.app");
    expect(linkRes?.title).toBe("Tauri Documentation");

    // Verify image resource
    const imgRes = resources.find((r) => r.resourceType === "image");
    expect(imgRes).toBeDefined();
    expect(imgRes?.targetUrl).toBe("assets/diagram.png");
    expect(imgRes?.title).toBe("Architecture Diagram");

    // Verify backlinks
    expect(backlinks.length).toBe(1);
    expect(backlinks[0]?.targetNoteId).toBe("not_arch1");
    expect(backlinks[0]?.sourceDocumentId).toBe("not_main");
  });

  it("handles empty or malformed documents gracefully", () => {
    const { resources, backlinks } = extractResourcesFromDoc(null, {
      parentDocumentId: "not_empty",
      parentDocumentType: "general",
      parentDocumentTitle: "Empty Note",
    });

    expect(resources).toEqual([]);
    expect(backlinks).toEqual([]);
  });
});
