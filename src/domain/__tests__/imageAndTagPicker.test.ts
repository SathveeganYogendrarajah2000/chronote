import { describe, it, expect } from "vitest";
import { serializeNodeToHtml } from "../export/htmlExporter";
import { normalizeTag, isValidTag, normalizeTagList } from "../tagNormalizer";
import { extractHeadings } from "../toc.utils";
import type { ProseMirrorNode } from "../document.types";

describe("Image Node & Resize Serialization", () => {
  it("serializes image with width and caption in HTML export", () => {
    const imageNode: ProseMirrorNode = {
      type: "image",
      attrs: {
        src: "assets/images/diagram.png",
        alt: "System Architecture",
        caption: "Figure 1: High Level Architecture",
        width: "480px",
        align: "center",
      },
    };

    const html = serializeNodeToHtml(imageNode);
    expect(html).toContain('src="assets/images/diagram.png"');
    expect(html).toContain('alt="System Architecture"');
    expect(html).toContain('width: 480px;');
    expect(html).toContain("Figure 1: High Level Architecture");
  });

  it("handles image without explicit width gracefully", () => {
    const imageNode: ProseMirrorNode = {
      type: "image",
      attrs: {
        src: "assets/screenshot.png",
        alt: "Debug Log",
      },
    };

    const html = serializeNodeToHtml(imageNode);
    expect(html).toContain('src="assets/screenshot.png"');
    expect(html).toContain("max-width: 100%");
  });
});

describe("Tag Picker Domain Rules", () => {
  it("validates tag naming correctly", () => {
    expect(isValidTag("backend")).toBe(true);
    expect(isValidTag("feature-auth")).toBe(true);
    expect(isValidTag("v0_1_5")).toBe(true);
    expect(isValidTag("#leading-hash")).toBe(true);
    expect(isValidTag("")).toBe(false);
    expect(isValidTag("spaces in tag")).toBe(false);
    expect(isValidTag("special@character")).toBe(false);
  });

  it("normalizes tags to lowercase alphanumeric dashed format", () => {
    expect(normalizeTag(" #Docker-Compose ")).toBe("docker-compose");
    expect(normalizeTag("Frontend")).toBe("frontend");
    expect(normalizeTag("###api_v2")).toBe("api_v2");
  });

  it("filters and deduplicates tag lists", () => {
    const raw = ["#DevOps", "devops", "kubernetes", "KUBERNETES", "api", ""];
    const normalized = normalizeTagList(raw);
    expect(normalized).toEqual(["api", "devops", "kubernetes"]);
  });
});

describe("Heading Index Navigation (Outline Feature)", () => {
  it("differentiates multiple headings with identical names by index", () => {
    const doc: ProseMirrorNode = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1, id: "blk_1" },
          content: [{ type: "text", text: "Overview" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "First section content" }],
        },
        {
          type: "heading",
          attrs: { level: 2, id: "blk_2" },
          content: [{ type: "text", text: "Overview" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second section content" }],
        },
        {
          type: "heading",
          attrs: { level: 3, id: "blk_3" },
          content: [{ type: "text", text: "Overview" }],
        },
      ],
    };

    const headings = extractHeadings(doc);
    expect(headings).toHaveLength(3);

    // Each heading must have distinct indices 0, 1, 2
    expect(headings[0]?.index).toBe(0);
    expect(headings[0]?.level).toBe(1);
    expect(headings[0]?.id).toBe("blk_1");

    expect(headings[1]?.index).toBe(1);
    expect(headings[1]?.level).toBe(2);
    expect(headings[1]?.id).toBe("blk_2");

    expect(headings[2]?.index).toBe(2);
    expect(headings[2]?.level).toBe(3);
    expect(headings[2]?.id).toBe("blk_3");
  });
});
