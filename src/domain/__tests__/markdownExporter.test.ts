import { describe, it, expect } from "vitest";
import {
  exportNoteToMarkdown,
  exportDsmEntryToMarkdown,
  exportDsmRangeToMarkdown,
  exportProseMirrorDocToMarkdown,
  sanitizeTitleToFilename,
} from "../export/markdownExporter";
import type { ProseMirrorNode } from "../document.types";
import type { GeneralNote } from "../note.types";
import type { DsmEntry } from "../dsm.types";

describe("Markdown Exporter", () => {
  it("sanitizes titles to valid filenames", () => {
    expect(sanitizeTitleToFilename("Spring Boot & Kafka")).toBe("spring_boot_kafka");
    expect(sanitizeTitleToFilename("   My Note!!!  ")).toBe("my_note");
    expect(sanitizeTitleToFilename("")).toBe("untitled");
  });

  it("serializes basic typography and formatting marks", () => {
    const doc: ProseMirrorNode = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Architecture Overview" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "This is " },
            { type: "text", text: "bold", marks: [{ type: "bold" }] },
            { type: "text", text: " and " },
            { type: "text", text: "italic", marks: [{ type: "italic" }] },
            { type: "text", text: " and " },
            { type: "text", text: "strikethrough", marks: [{ type: "strike" }] },
            { type: "text", text: " and " },
            { type: "text", text: "inline code", marks: [{ type: "code" }] },
            { type: "text", text: "." },
          ],
        },
      ],
    };

    const md = exportProseMirrorDocToMarkdown(doc);
    expect(md).toContain("# Architecture Overview");
    expect(md).toContain("This is **bold** and *italic* and ~~strikethrough~~ and `inline code`.");
  });

  it("serializes code blocks with language and blockquotes", () => {
    const doc: ProseMirrorNode = {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "typescript", id: "blk_1" },
          content: [{ type: "text", text: "const x: number = 42;\nconsole.log(x);" }],
        },
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Important architectural note" }],
            },
          ],
        },
        {
          type: "horizontalRule",
        },
      ],
    };

    const md = exportProseMirrorDocToMarkdown(doc);
    expect(md).toContain("```typescript\nconst x: number = 42;\nconsole.log(x);\n```");
    expect(md).toContain("> Important architectural note");
    expect(md).toContain("---");
  });

  it("serializes bullet lists, ordered lists, and task lists", () => {
    const doc: ProseMirrorNode = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First bullet" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Second bullet" }],
                },
              ],
            },
          ],
        },
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Pending task" }],
                },
              ],
            },
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Completed task" }],
                },
              ],
            },
          ],
        },
      ],
    };

    const md = exportProseMirrorDocToMarkdown(doc);
    expect(md).toContain("- First bullet");
    expect(md).toContain("- Second bullet");
    expect(md).toContain("- [ ] Pending task");
    expect(md).toContain("- [x] Completed task");
  });

  it("serializes GFM tables accurately", () => {
    const doc: ProseMirrorNode = {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Name" }] }],
                },
                {
                  type: "tableHeader",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Role" }] }],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Alice" }] }],
                },
                {
                  type: "tableCell",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Lead" }] }],
                },
              ],
            },
          ],
        },
      ],
    };

    const md = exportProseMirrorDocToMarkdown(doc);
    expect(md).toContain("| Name | Role |");
    expect(md).toContain("| --- | --- |");
    expect(md).toContain("| Alice | Lead |");
  });

  it("handles internal note links in both default relative mode and wiki-link mode", () => {
    const doc: ProseMirrorNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Refer to " },
            {
              type: "text",
              text: "Backend Design",
              marks: [
                {
                  type: "internalLink",
                  attrs: { noteId: "not_123", noteTitle: "Backend Design" },
                },
              ],
            },
            { type: "text", text: " for details." },
          ],
        },
      ],
    };

    const relativeMd = exportProseMirrorDocToMarkdown(doc, { wikiLinkMode: false });
    expect(relativeMd).toContain("[Backend Design](./backend_design.md)");

    const wikiMd = exportProseMirrorDocToMarkdown(doc, { wikiLinkMode: true });
    expect(wikiMd).toContain("[[Backend Design]]");
  });

  it("exports full GeneralNote with tags and frontmatter", () => {
    const note: GeneralNote = {
      id: "not_01JC87XK89",
      schemaVersion: 1,
      title: "Kafka Pipeline Investigation",
      tags: ["kafka", "streaming", "backend"],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Investigating lag in consumer group." }],
          },
        ],
      },
      pinned: false,
      createdAt: "2026-09-19T10:00:00Z",
      updatedAt: "2026-09-19T12:00:00Z",
    };

    const md = exportNoteToMarkdown(note, { includeTags: true, includeTitle: true });
    expect(md).toContain("# Kafka Pipeline Investigation");
    expect(md).toContain("> Tags: #kafka #streaming #backend");
    expect(md).toContain("Investigating lag in consumer group.");

    const fm = exportNoteToMarkdown(note, { includeFrontmatter: true });
    expect(fm).toContain("---");
    expect(fm).toContain('title: "Kafka Pipeline Investigation"');
    expect(fm).toContain('  - "kafka"');
  });

  it("exports DSM entry and DSM date ranges correctly", () => {
    const entries: DsmEntry[] = [
      {
        id: "ent_1",
        date: "2026-09-15",
        tags: ["auth", "jwt"],
        collapsed: false,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Completed JWT token refresh rotation." }],
            },
          ],
        },
        createdAt: "2026-09-15T09:00:00Z",
        updatedAt: "2026-09-15T10:00:00Z",
      },
      {
        id: "ent_2",
        date: "2026-09-16",
        tags: ["database", "postgres"],
        collapsed: false,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Migrated index to btree composite." }],
            },
          ],
        },
        createdAt: "2026-09-16T09:00:00Z",
        updatedAt: "2026-09-16T10:00:00Z",
      },
    ];

    const singleMd = exportDsmEntryToMarkdown(entries[0]);
    expect(singleMd).toContain("## 2026-09-15");
    expect(singleMd).toContain("> Tags: #auth #jwt");
    expect(singleMd).toContain("Completed JWT token refresh rotation.");

    const rangeMd = exportDsmRangeToMarkdown(entries, { from: "2026-09-15", to: "2026-09-16" });
    expect(rangeMd).toContain("# DSM Stand-up Journal (2026-09-15 to 2026-09-16)");
    expect(rangeMd).toContain("## 2026-09-16");
    expect(rangeMd).toContain("## 2026-09-15");
  });
});
