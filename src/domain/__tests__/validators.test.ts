import { describe, it, expect } from "vitest";
import {
  TagSchema,
  IsoDateSchema,
  DsmEntrySchema,
  GeneralNoteSchema,
  WorkspaceSchema,
} from "../validators";

describe("Domain Validators", () => {
  describe("TagSchema", () => {
    it("transforms and validates clean tags", () => {
      expect(TagSchema.parse("#SpringBoot")).toBe("springboot");
      expect(TagSchema.parse("  #aws-lambda  ")).toBe("aws-lambda");
    });

    it("rejects invalid tags", () => {
      expect(() => TagSchema.parse("not a tag")).toThrow();
      expect(() => TagSchema.parse("tag!invalid")).toThrow();
      expect(() => TagSchema.parse("")).toThrow();
    });
  });

  describe("IsoDateSchema", () => {
    it("validates valid Gregorian dates", () => {
      expect(IsoDateSchema.parse("2026-09-16")).toBe("2026-09-16");
      expect(IsoDateSchema.parse("2024-02-29")).toBe("2024-02-29"); // Leap year
    });

    it("rejects invalid date strings", () => {
      expect(() => IsoDateSchema.parse("2026-02-30")).toThrow(); // Feb 30 invalid
      expect(() => IsoDateSchema.parse("16-09-2026")).toThrow();
      expect(() => IsoDateSchema.parse("invalid-date")).toThrow();
    });
  });

  describe("DsmEntrySchema", () => {
    it("validates well-formed DSM entry", () => {
      const entry = {
        id: "ent_01JC87W9E30000000000",
        date: "2026-09-16",
        tags: ["#springboot", "backend"],
        collapsed: false,
        content: { type: "doc", content: [] },
        createdAt: "2026-09-16T08:00:00.000Z",
        updatedAt: "2026-09-16T08:30:00.000Z",
      };

      const parsed = DsmEntrySchema.parse(entry);
      expect(parsed.id).toBe("ent_01JC87W9E30000000000");
      expect(parsed.tags).toEqual(["springboot", "backend"]);
      expect(parsed.collapsed).toBe(false);
    });

    it("rejects entry with non-ent_ id prefix", () => {
      const invalid = {
        id: "not_1234567890",
        date: "2026-09-16",
        tags: [],
        collapsed: false,
        content: {},
        createdAt: "2026-09-16T08:00:00.000Z",
        updatedAt: "2026-09-16T08:30:00.000Z",
      };
      expect(() => DsmEntrySchema.parse(invalid)).toThrow();
    });
  });

  describe("GeneralNoteSchema", () => {
    it("validates well-formed General Note", () => {
      const note = {
        id: "not_01JC87XK89",
        schemaVersion: 1,
        title: "Spring Security Architecture",
        tags: ["springboot", "security"],
        content: { type: "doc", content: [] },
        pinned: true,
        createdAt: "2026-09-16T08:00:00.000Z",
        updatedAt: "2026-09-16T08:30:00.000Z",
      };

      const parsed = GeneralNoteSchema.parse(note);
      expect(parsed.id).toBe("not_01JC87XK89");
      expect(parsed.pinned).toBe(true);
    });
  });

  describe("WorkspaceSchema", () => {
    it("validates workspace metadata and default settings", () => {
      const ws = {
        id: "wsp_01JC87V1M4P9X7",
        schemaVersion: 1,
        name: "Dev Workspace",
        path: "E:/notes/dev",
        createdAt: "2026-09-16T08:00:00.000Z",
        updatedAt: "2026-09-16T08:30:00.000Z",
        settings: {
          editorFontSize: 15,
          editorLineHeight: 1.6,
          theme: "dark" as const,
          dsmSortOrder: "desc" as const,
          autosaveIntervalMs: 800,
        },
      };

      const parsed = WorkspaceSchema.parse(ws);
      expect(parsed.name).toBe("Dev Workspace");
      expect(parsed.settings.theme).toBe("dark");
    });
  });
});
