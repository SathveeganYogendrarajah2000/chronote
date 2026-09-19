import { describe, it, expect } from "vitest";
import {
  buildNoteDocx,
  buildDsmEntryDocx,
  buildDsmRangeDocx,
  packDocxToUint8Array,
} from "../export/docxExporter";
import type { GeneralNote } from "../note.types";
import type { DsmEntry } from "../dsm.types";

describe("DOCX Exporter", () => {
  it("builds and packs a GeneralNote into a valid OpenXML DOCX buffer", async () => {
    const note: GeneralNote = {
      id: "not_1",
      schemaVersion: 1,
      title: "Microservice Reliability Patterns",
      tags: ["architecture", "resilience"],
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Circuit Breakers" }],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Implemented with " },
              { type: "text", text: "Resilience4j", marks: [{ type: "bold" }] },
              { type: "text", text: " library." },
            ],
          },
          {
            type: "codeBlock",
            attrs: { language: "java", id: "blk_1" },
            content: [{ type: "text", text: "@CircuitBreaker(name = \"backendA\")\npublic String doCall() { return \"ok\"; }" }],
          },
        ],
      },
      pinned: true,
      createdAt: "2026-09-19T10:00:00Z",
      updatedAt: "2026-09-19T12:00:00Z",
    };

    const doc = buildNoteDocx(note, { includeTitle: true, includeTags: true });
    expect(doc).toBeDefined();

    const bytes = await packDocxToUint8Array(doc);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);

    // Standard OpenXML / ZIP magic header: 0x50, 0x4B, 0x03, 0x04 ("PK\x03\x04")
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
  });

  it("builds and packs a single DSM entry into a valid DOCX buffer", async () => {
    const entry: DsmEntry = {
      id: "ent_1",
      date: "2026-09-19",
      tags: ["standup", "frontend"],
      collapsed: false,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Worked on export dialog." }],
          },
        ],
      },
      createdAt: "2026-09-19T08:00:00Z",
      updatedAt: "2026-09-19T09:00:00Z",
    };

    const doc = buildDsmEntryDocx(entry, { includeTitle: true, includeTags: true });
    expect(doc).toBeDefined();

    const bytes = await packDocxToUint8Array(doc);
    expect(bytes.length).toBeGreaterThan(500);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it("builds and packs a DSM date range into a valid DOCX buffer", async () => {
    const entries: DsmEntry[] = [
      {
        id: "ent_1",
        date: "2026-09-18",
        tags: ["api"],
        collapsed: false,
        content: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Sprint review" }] }],
        },
        createdAt: "2026-09-18T08:00:00Z",
        updatedAt: "2026-09-18T09:00:00Z",
      },
    ];

    const doc = buildDsmRangeDocx(entries, { from: "2026-09-15", to: "2026-09-19" });
    expect(doc).toBeDefined();

    const bytes = await packDocxToUint8Array(doc);
    expect(bytes.length).toBeGreaterThan(500);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });
});
