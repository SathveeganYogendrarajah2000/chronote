import { describe, it, expect } from "vitest";
import { replaceTextInProseMirrorDoc } from "../replace.utils";
import type { ProseMirrorNode } from "../document.types";

describe("replaceTextInProseMirrorDoc", () => {
  it("replaces case-insensitive matches across paragraphs and nested marks", () => {
    const doc: ProseMirrorNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { id: "blk_1" },
          content: [
            { type: "text", text: "React 18 was good. " },
            {
              type: "text",
              text: "React is awesome.",
              marks: [{ type: "bold" }],
            },
          ],
        },
        {
          type: "heading",
          attrs: { id: "blk_2", level: 2 },
          content: [{ type: "text", text: "Learning react today" }],
        },
      ],
    };

    const { updatedDoc, matchCount } = replaceTextInProseMirrorDoc(
      doc,
      "react",
      "Vue",
      false
    );

    expect(matchCount).toBe(3);
    const p = updatedDoc.content?.[0];
    expect(p?.content?.[0]?.text).toBe("Vue 18 was good. ");
    expect(p?.content?.[1]?.text).toBe("Vue is awesome.");
    expect(p?.content?.[1]?.marks).toEqual([{ type: "bold" }]);
    expect(p?.attrs?.id).toBe("blk_1");

    const h = updatedDoc.content?.[1];
    expect(h?.content?.[0]?.text).toBe("Learning Vue today");
  });

  it("respects case sensitivity flag", () => {
    const doc: ProseMirrorNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "SQL and sql and Sql" }],
        },
      ],
    };

    const { updatedDoc, matchCount } = replaceTextInProseMirrorDoc(
      doc,
      "SQL",
      "Postgres",
      true
    );

    expect(matchCount).toBe(1);
    expect(updatedDoc.content?.[0]?.content?.[0]?.text).toBe(
      "Postgres and sql and Sql"
    );
  });

  it("returns unchanged doc if search term is empty or not found", () => {
    const doc: ProseMirrorNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "No matches here" }],
        },
      ],
    };

    const { updatedDoc, matchCount } = replaceTextInProseMirrorDoc(
      doc,
      "missing",
      "found"
    );
    expect(matchCount).toBe(0);
    expect(updatedDoc).toEqual(doc);
  });
});

