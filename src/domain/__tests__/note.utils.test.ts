import { describe, it, expect } from "vitest";
import {
  createDefaultGeneralNote,
  sortNotes,
  filterNotes,
} from "../note.utils";
import type { NoteMetadata } from "../note.types";
import { GeneralNoteSchema } from "../validators";

describe("note.utils", () => {
  describe("createDefaultGeneralNote", () => {
    it("creates a valid GeneralNote entity conforming to GeneralNoteSchema", () => {
      const note = createDefaultGeneralNote({
        title: "Postgres Indexing",
        tags: ["#Database", "SQL_PERF"],
        initialText: "Use B-Tree for equality checks.",
      });

      expect(note.id).toMatch(/^not_/);
      expect(note.schemaVersion).toBe(1);
      expect(note.title).toBe("Postgres Indexing");
      expect(note.tags).toEqual(["database", "sql_perf"]);
      expect(note.pinned).toBe(false);
      expect(note.content.type).toBe("doc");
      expect(note.createdAt).toBeDefined();
      expect(note.updatedAt).toBeDefined();

      const parseResult = GeneralNoteSchema.safeParse(note);
      expect(parseResult.success).toBe(true);
    });

    it("defaults title to 'Untitled Note' when omitted or blank", () => {
      const emptyNote = createDefaultGeneralNote();
      expect(emptyNote.title).toBe("Untitled Note");
      expect(emptyNote.tags).toEqual([]);

      const whitespaceNote = createDefaultGeneralNote({ title: "   " });
      expect(whitespaceNote.title).toBe("Untitled Note");
    });

    it("honors custom id and pinned parameters", () => {
      const note = createDefaultGeneralNote({
        id: "not_custom1234567890",
        pinned: true,
      });

      expect(note.id).toBe("not_custom1234567890");
      expect(note.pinned).toBe(true);
    });
  });

  describe("sortNotes", () => {
    const mockNotes: NoteMetadata[] = [
      {
        id: "not_1",
        title: "Zebra Investigation",
        tags: ["debug"],
        pinned: false,
        updatedAt: "2026-09-15T10:00:00Z",
      },
      {
        id: "not_2",
        title: "Alpha Architecture",
        tags: ["arch"],
        pinned: false,
        updatedAt: "2026-09-18T12:00:00Z",
      },
      {
        id: "not_3",
        title: "Pinned Note Beta",
        tags: ["critical"],
        pinned: true,
        updatedAt: "2026-09-10T08:00:00Z",
      },
      {
        id: "not_4",
        title: "Pinned Note Alpha",
        tags: ["core"],
        pinned: true,
        updatedAt: "2026-09-12T09:00:00Z",
      },
    ];

    it("sorts pinned notes first, then by updatedAt descending (default)", () => {
      const sorted = sortNotes(mockNotes, "recent");
      expect(sorted.map((n) => n.id)).toEqual(["not_4", "not_3", "not_2", "not_1"]);
    });

    it("sorts pinned notes first, then alphabetically by title", () => {
      const sorted = sortNotes(mockNotes, "title");
      expect(sorted.map((n) => n.id)).toEqual(["not_4", "not_3", "not_2", "not_1"]);
    });
  });

  describe("filterNotes", () => {
    const sampleNotes: NoteMetadata[] = [
      {
        id: "not_1",
        title: "Spring Security JWT Filter",
        tags: ["backend", "java", "security"],
        pinned: false,
        updatedAt: "2026-09-18T10:00:00Z",
      },
      {
        id: "not_2",
        title: "Docker Compose on Windows",
        tags: ["devops", "containers"],
        pinned: false,
        updatedAt: "2026-09-17T10:00:00Z",
      },
      {
        id: "not_3",
        title: "PostgreSQL Migration Strategies",
        tags: ["database", "sql"],
        pinned: true,
        updatedAt: "2026-09-16T10:00:00Z",
      },
    ];

    it("returns all notes when query is empty", () => {
      expect(filterNotes(sampleNotes, "")).toHaveLength(3);
      expect(filterNotes(sampleNotes, "   ")).toHaveLength(3);
    });

    it("matches notes by case-insensitive title search", () => {
      const results = filterNotes(sampleNotes, "security");
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("not_1");
    });

    it("matches notes by tags (with or without # prefix)", () => {
      const byTagWithoutHash = filterNotes(sampleNotes, "devops");
      expect(byTagWithoutHash).toHaveLength(1);
      expect(byTagWithoutHash[0]?.id).toBe("not_2");

      const byTagWithHash = filterNotes(sampleNotes, "#sql");
      expect(byTagWithHash).toHaveLength(1);
      expect(byTagWithHash[0]?.id).toBe("not_3");
    });
  });
});
