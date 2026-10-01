import { describe, it, expect } from "vitest";
import { filterNotesByTags } from "../note.utils";
import { filterDsmEntriesByTags } from "../dsm.utils";
import type { NoteMetadata } from "../note.types";
import type { DsmEntry } from "../dsm.types";

describe("multiTagFilter", () => {
  const sampleNotes: NoteMetadata[] = [
    {
      id: "note_1",
      title: "Backend API Auth",
      tags: ["backend", "auth", "security"],
      pinned: false,
      updatedAt: "2026-09-01T10:00:00Z",
    },
    {
      id: "note_2",
      title: "Frontend Dashboard",
      tags: ["frontend", "ui", "react"],
      pinned: true,
      updatedAt: "2026-09-02T10:00:00Z",
    },
    {
      id: "note_3",
      title: "Fullstack Architecture",
      tags: ["backend", "frontend", "architecture"],
      pinned: false,
      updatedAt: "2026-09-03T10:00:00Z",
    },
  ];

  it("returns all notes when no tags are selected", () => {
    expect(filterNotesByTags(sampleNotes, [])).toHaveLength(3);
  });

  it("filters notes with single tag", () => {
    const res = filterNotesByTags(sampleNotes, ["backend"]);
    expect(res.map((n) => n.id)).toEqual(["note_1", "note_3"]);
  });

  it("filters notes with multiple tags in AND mode (default)", () => {
    const res = filterNotesByTags(sampleNotes, ["backend", "frontend"], "and");
    expect(res.map((n) => n.id)).toEqual(["note_3"]);
  });

  it("filters notes with multiple tags in OR mode", () => {
    const res = filterNotesByTags(sampleNotes, ["auth", "react"], "or");
    expect(res.map((n) => n.id)).toEqual(["note_1", "note_2"]);
  });

  it("handles hash prefix and case insensitivity in tags", () => {
    const res = filterNotesByTags(sampleNotes, ["#BACKEND", "#Security"], "and");
    expect(res.map((n) => n.id)).toEqual(["note_1"]);
  });

  const sampleDsmEntries: DsmEntry[] = [
    {
      id: "entry_1",
      date: "2026-10-01",
      tags: ["standup", "bugfix"],
      collapsed: false,
      content: { type: "doc" },
      createdAt: "2026-10-01T09:00:00Z",
      updatedAt: "2026-10-01T09:00:00Z",
    },
    {
      id: "entry_2",
      date: "2026-09-30",
      tags: ["standup", "feature", "release"],
      collapsed: false,
      content: { type: "doc" },
      createdAt: "2026-09-30T09:00:00Z",
      updatedAt: "2026-09-30T09:00:00Z",
    },
    {
      id: "entry_3",
      date: "2026-09-29",
      tags: ["incident", "bugfix"],
      collapsed: false,
      content: { type: "doc" },
      createdAt: "2026-09-29T09:00:00Z",
      updatedAt: "2026-09-29T09:00:00Z",
    },
  ];

  it("filters DSM entries with multiple tags in AND mode", () => {
    const res = filterDsmEntriesByTags(sampleDsmEntries, ["standup", "bugfix"], "and");
    expect(res.map((e) => e.date)).toEqual(["2026-10-01"]);
  });

  it("filters DSM entries with multiple tags in OR mode", () => {
    const res = filterDsmEntriesByTags(sampleDsmEntries, ["release", "incident"], "or");
    expect(res.map((e) => e.date)).toEqual(["2026-09-30", "2026-09-29"]);
  });
});
