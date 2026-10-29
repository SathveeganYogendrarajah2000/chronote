import { describe, it, expect } from "vitest";
import {
  createDefaultGeneralNote,
  sortNotes,
  groupNotesBySection,
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
        section: "Database",
        initialText: "Use B-Tree for equality checks.",
      });

      expect(note.id).toMatch(/^not_/);
      expect(note.schemaVersion).toBe(1);
      expect(note.title).toBe("Postgres Indexing");
      expect(note.tags).toEqual(["database", "sql_perf"]);
      expect(note.section).toBe("Database");
      expect(note.pinned).toBe(false);
      expect(note.content.type).toBe("doc");
      expect(note.createdAt).toBeDefined();
      expect(note.updatedAt).toBeDefined();

      const parseResult = GeneralNoteSchema.safeParse(note);
      expect(parseResult.success).toBe(true);
    });

    it("defaults section to 'General' and title to 'Untitled Note' when omitted or blank", () => {
      const emptyNote = createDefaultGeneralNote();
      expect(emptyNote.title).toBe("Untitled Note");
      expect(emptyNote.section).toBe("General");
      expect(emptyNote.tags).toEqual([]);

      const whitespaceNote = createDefaultGeneralNote({ title: "   ", section: "   " });
      expect(whitespaceNote.title).toBe("Untitled Note");
      expect(whitespaceNote.section).toBe("General");
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

    it("sorts pinned notes first, then by updatedAt descending", () => {
      const sorted = sortNotes(mockNotes, "recent");
      expect(sorted.map((n) => n.id)).toEqual(["not_4", "not_3", "not_2", "not_1"]);
    });

    it("sorts pinned notes first, then alphabetically by title", () => {
      const sorted = sortNotes(mockNotes, "title");
      expect(sorted.map((n) => n.id)).toEqual(["not_4", "not_3", "not_2", "not_1"]);
    });
  });

  describe("groupNotesBySection", () => {
    const sampleNotes: NoteMetadata[] = [
      { id: "n1", title: "Zebra in Backend", tags: [], section: "Backend", pinned: false, updatedAt: "2026-09-10T10:00:00Z" },
      { id: "n2", title: "Alpha in Backend", tags: [], section: "Backend", pinned: false, updatedAt: "2026-09-12T10:00:00Z" },
      { id: "n3", title: "General Note B", tags: [], section: "General", pinned: false, updatedAt: "2026-09-11T10:00:00Z" },
      { id: "n4", title: "General Note A", tags: [], section: "General", pinned: true, updatedAt: "2026-09-09T10:00:00Z" },
      { id: "n5", title: "DevOps Pipeline", tags: [], section: "DevOps", pinned: false, updatedAt: "2026-09-13T10:00:00Z" },
      { id: "n6", title: "Architecture RFC", tags: [], section: "Architecture", pinned: false, updatedAt: "2026-09-14T10:00:00Z" },
    ];

    it("orders pinned sections strictly by pinned order, and unpinned sections alphabetically", () => {
      const pinnedSections = ["DevOps", "Backend"];
      const customSections = ["Frontend", "EmptyFolder"];

      const groups = groupNotesBySection(sampleNotes, pinnedSections, customSections, "title");

      // Pinned sections first: DevOps, Backend
      // Followed by unpinned sections alphabetically: Architecture, EmptyFolder, Frontend, General
      expect(groups.map((g) => g.name)).toEqual([
        "DevOps",
        "Backend",
        "Architecture",
        "EmptyFolder",
        "Frontend",
        "General",
      ]);

      expect(groups[0]?.isPinned).toBe(true);
      expect(groups[1]?.isPinned).toBe(true);
      expect(groups[2]?.isPinned).toBe(false);
    });

    it("sorts notes inside each section alphabetically by title when sortBy='title'", () => {
      const groups = groupNotesBySection(sampleNotes, [], [], "title");
      const backendGroup = groups.find((g) => g.name === "Backend");
      expect(backendGroup?.notes.map((n) => n.title)).toEqual([
        "Alpha in Backend",
        "Zebra in Backend",
      ]);
    });

    it("sorts notes inside each section by updatedAt when sortBy='updatedAt'", () => {
      const groups = groupNotesBySection(sampleNotes, [], [], "updatedAt");
      const backendGroup = groups.find((g) => g.name === "Backend");
      expect(backendGroup?.notes.map((n) => n.title)).toEqual([
        "Alpha in Backend", // 2026-09-12
        "Zebra in Backend", // 2026-09-10
      ]);
    });

    it("floats pinned notes inside a section to the top of that section", () => {
      const groups = groupNotesBySection(sampleNotes, [], [], "title");
      const generalGroup = groups.find((g) => g.name === "General");
      expect(generalGroup?.notes.map((n) => n.id)).toEqual(["n4", "n3"]);
    });
  });

  describe("filterNotes", () => {
    const sampleNotes: NoteMetadata[] = [
      {
        id: "not_1",
        title: "Spring Security JWT Filter",
        tags: ["backend", "java", "security"],
        section: "Backend",
        pinned: false,
        updatedAt: "2026-09-18T10:00:00Z",
      },
      {
        id: "not_2",
        title: "Docker Compose on Windows",
        tags: ["devops", "containers"],
        section: "DevOps",
        pinned: false,
        updatedAt: "2026-09-17T10:00:00Z",
      },
      {
        id: "not_3",
        title: "PostgreSQL Migration Strategies",
        tags: ["database", "sql"],
        section: "Database",
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

    it("matches notes by section name search", () => {
      const results = filterNotes(sampleNotes, "devops");
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("not_2");
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
