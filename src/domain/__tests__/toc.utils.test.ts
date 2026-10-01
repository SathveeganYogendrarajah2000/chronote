import { describe, it, expect } from "vitest";
import { extractHeadings } from "../toc.utils";
import type { ProseMirrorNode } from "../document.types";

describe("toc.utils", () => {
  it("returns empty array for null, undefined, or empty doc", () => {
    expect(extractHeadings(null)).toEqual([]);
    expect(extractHeadings(undefined)).toEqual([]);
    expect(extractHeadings({ type: "doc" })).toEqual([]);
    expect(extractHeadings({ type: "doc", content: [] })).toEqual([]);
  });

  it("extracts h1, h2, and h3 headings in document order", () => {
    const doc: ProseMirrorNode = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1, id: "blk_h1" },
          content: [{ type: "text", text: "Introduction" }],
        },
        {
          type: "paragraph",
          attrs: { id: "blk_p1" },
          content: [{ type: "text", text: "Some introductory content." }],
        },
        {
          type: "heading",
          attrs: { level: 2, id: "blk_h2" },
          content: [{ type: "text", text: "Architecture Overview" }],
        },
        {
          type: "heading",
          attrs: { level: 3, id: "blk_h3" },
          content: [{ type: "text", text: "Database Schema" }],
        },
      ],
    };

    const headings = extractHeadings(doc);
    expect(headings).toHaveLength(3);
    expect(headings[0]).toEqual({
      id: "blk_h1",
      level: 1,
      text: "Introduction",
      index: 0,
    });
    expect(headings[1]).toEqual({
      id: "blk_h2",
      level: 2,
      text: "Architecture Overview",
      index: 1,
    });
    expect(headings[2]).toEqual({
      id: "blk_h3",
      level: 3,
      text: "Database Schema",
      index: 2,
    });
  });

  it("handles headings with marks and formatting", () => {
    const doc: ProseMirrorNode = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, id: "blk_mark" },
          content: [
            { type: "text", text: "Deploying " },
            { type: "text", text: "Kubernetes", marks: [{ type: "bold" }] },
            { type: "text", text: " Cluster" },
          ],
        },
      ],
    };

    const headings = extractHeadings(doc);
    expect(headings).toHaveLength(1);
    expect(headings[0]?.text).toBe("Deploying Kubernetes Cluster");
    expect(headings[0]?.level).toBe(2);
  });

  it("assigns fallback id and title for empty headings", () => {
    const doc: ProseMirrorNode = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [],
        },
      ],
    };

    const headings = extractHeadings(doc);
    expect(headings).toHaveLength(1);
    expect(headings[0]?.text).toBe("Untitled Heading 1");
    expect(headings[0]?.id).toBe("heading-0");
  });
});
