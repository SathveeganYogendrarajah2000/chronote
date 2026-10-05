import { describe, it, expect } from "vitest";
import {
  getDaysRemaining,
  formatDaysRemaining,
  isExpired,
  groupBinnedNotesBySection,
  groupBinnedNotesByAge,
} from "../bin.utils";
import type { BinnedNoteRecord } from "../bin.types";

describe("bin.utils", () => {
  const baseNow = new Date("2026-10-05T12:00:00Z").getTime();

  it("correctly calculates days remaining", () => {
    // 30 days from baseNow
    const expires30d = new Date("2026-11-04T12:00:00Z").toISOString();
    expect(getDaysRemaining(expires30d, baseNow)).toBe(30);

    // 1 day from baseNow
    const expires1d = new Date("2026-10-06T12:00:00Z").toISOString();
    expect(getDaysRemaining(expires1d, baseNow)).toBe(1);

    // Expired in past
    const expired = new Date("2026-10-04T12:00:00Z").toISOString();
    expect(getDaysRemaining(expired, baseNow)).toBe(0);
  });

  it("formats days remaining label", () => {
    expect(formatDaysRemaining(30)).toBe("30 days left");
    expect(formatDaysRemaining(1)).toBe("1 day left");
    expect(formatDaysRemaining(0)).toBe("Expiring today");
    expect(formatDaysRemaining(-2)).toBe("Expiring today");
  });

  it("detects expired items", () => {
    const expiresFuture = new Date("2026-10-15T12:00:00Z").toISOString();
    expect(isExpired(expiresFuture, baseNow)).toBe(false);

    const expiresPast = new Date("2026-10-01T12:00:00Z").toISOString();
    expect(isExpired(expiresPast, baseNow)).toBe(true);
  });

  it("groups binned notes by section and age", () => {
    const items: BinnedNoteRecord[] = [
      {
        id: "not_1",
        title: "Note 1",
        tags: ["dev"],
        deletedAt: "2026-10-05T10:00:00Z",
        expiresAt: "2026-11-04T10:00:00Z", // ~30 days left
        originalSection: "notes",
        note: {
          id: "not_1",
          schemaVersion: 1,
          title: "Note 1",
          tags: ["dev"],
          content: { type: "doc", content: [] },
          pinned: false,
          createdAt: "",
          updatedAt: "",
        },
      },
      {
        id: "not_2",
        title: "Note 2",
        tags: [],
        deletedAt: "2026-09-08T10:00:00Z",
        expiresAt: "2026-10-08T10:00:00Z", // ~3 days left
        originalSection: "notes",
        note: {
          id: "not_2",
          schemaVersion: 1,
          title: "Note 2",
          tags: [],
          content: { type: "doc", content: [] },
          pinned: false,
          createdAt: "",
          updatedAt: "",
        },
      },
    ];

    const bySection = groupBinnedNotesBySection(items);
    expect(bySection.notes).toBeDefined();
    expect(bySection.notes.length).toBe(2);

    const byAge = groupBinnedNotesByAge(items, baseNow);
    expect(byAge.recent.length).toBe(1);
    expect(byAge.recent[0].id).toBe("not_1");
    expect(byAge.expiringSoon.length).toBe(1);
    expect(byAge.expiringSoon[0].id).toBe("not_2");
  });
});
