import { describe, it, expect } from "vitest";
import {
  isValidIsoDate,
  formatDateLabel,
  deriveDsmEntryPreview,
  textToProseMirrorDoc,
  proseMirrorDocToText,
  createDefaultDsmEntry,
  createDefaultDsmDocument,
  sortDsmEntries,
} from "../dsm.utils";

describe("dsm.utils", () => {
  describe("isValidIsoDate", () => {
    it("accepts valid Gregorian calendar dates", () => {
      expect(isValidIsoDate("2026-09-16")).toBe(true);
      expect(isValidIsoDate("2024-02-29")).toBe(true); // 2024 is leap year
      expect(isValidIsoDate("2000-01-01")).toBe(true);
    });

    it("rejects non-existent calendar dates", () => {
      expect(isValidIsoDate("2026-02-29")).toBe(false); // 2026 is not leap year
      expect(isValidIsoDate("2026-04-31")).toBe(false); // April has 30 days
      expect(isValidIsoDate("2026-13-01")).toBe(false); // Month 13
      expect(isValidIsoDate("2026-00-10")).toBe(false); // Month 0
      expect(isValidIsoDate("2026-05-32")).toBe(false); // Day 32
    });

    it("rejects invalid date string formats", () => {
      expect(isValidIsoDate("16-09-2026")).toBe(false);
      expect(isValidIsoDate("2026/09/16")).toBe(false);
      expect(isValidIsoDate("not-a-date")).toBe(false);
      expect(isValidIsoDate("")).toBe(false);
    });
  });

  describe("formatDateLabel", () => {
    it("returns correct day of week and formatted date", () => {
      const result = formatDateLabel("2026-09-16");
      expect(result.dayOfWeek).toBe("Wednesday");
      expect(result.formattedDate).toBe("Sep 16, 2026");
    });

    it("identifies today and yesterday correctly", () => {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(
        yesterday.getMonth() + 1
      ).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

      expect(formatDateLabel(todayStr).isToday).toBe(true);
      expect(formatDateLabel(todayStr).isYesterday).toBe(false);

      expect(formatDateLabel(yesterdayStr).isToday).toBe(false);
      expect(formatDateLabel(yesterdayStr).isYesterday).toBe(true);
    });
  });

  describe("deriveDsmEntryPreview", () => {
    it("returns default message when content is empty", () => {
      const emptyDoc = { type: "doc", content: [] };
      expect(deriveDsmEntryPreview(emptyDoc)).toBe("No stand-up notes recorded yet.");
    });

    it("extracts and trims single paragraph text", () => {
      const doc = textToProseMirrorDoc("Investigating Auth Token Expiry issue in gateway.");
      expect(deriveDsmEntryPreview(doc)).toBe(
        "Investigating Auth Token Expiry issue in gateway."
      );
    });

    it("truncates content longer than 120 characters with an ellipsis", () => {
      const longText =
        "This is an extensive stand-up note detailing our multi-day migration of the database cluster from legacy MongoDB 4.4 to modern MongoDB 7.0 with zero downtime!";
      const doc = textToProseMirrorDoc(longText);
      const preview = deriveDsmEntryPreview(doc);

      expect(preview.length).toBeLessThanOrEqual(120);
      expect(preview.endsWith("...")).toBe(true);
      expect(preview).toBe(
        "This is an extensive stand-up note detailing our multi-day migration of the database cluster from legacy MongoDB 4.4..."
      );
    });

    it("skips leading empty paragraphs to find the first meaningful text", () => {
      const doc = {
        type: "doc",
        content: [
          { type: "paragraph", content: [] },
          { type: "paragraph", content: [{ type: "text", text: "   " }] },
          { type: "paragraph", content: [{ type: "text", text: "Second line has the actual update." }] },
        ],
      };
      expect(deriveDsmEntryPreview(doc)).toBe("Second line has the actual update.");
    });
  });

  describe("textToProseMirrorDoc & proseMirrorDocToText", () => {
    it("round-trips multi-line text cleanly", () => {
      const original = "Line 1: Started task\nLine 2: Investigated error\nLine 3: PR created";
      const doc = textToProseMirrorDoc(original);
      expect(doc.type).toBe("doc");
      expect(doc.content?.length).toBe(3);

      const recovered = proseMirrorDocToText(doc);
      expect(recovered).toBe(original);
    });

    it("handles empty text safely", () => {
      const doc = textToProseMirrorDoc("");
      expect(doc.type).toBe("doc");
      expect(doc.content?.length).toBe(1);
      expect(proseMirrorDocToText(doc)).toBe("");
    });
  });

  describe("createDefaultDsmEntry & createDefaultDsmDocument", () => {
    it("creates an entry with ent_ prefixed ID and normalized tags", () => {
      const entry = createDefaultDsmEntry("2026-09-16", ["#Springboot", "Backend"], "Initial content");
      expect(entry.id.startsWith("ent_")).toBe(true);
      expect(entry.date).toBe("2026-09-16");
      expect(entry.tags).toEqual(["backend", "springboot"]);
      expect(entry.collapsed).toBe(false);
      expect(proseMirrorDocToText(entry.content)).toBe("Initial content");
    });

    it("creates a valid default document container", () => {
      const doc = createDefaultDsmDocument();
      expect(doc.id).toBe("dsm_master");
      expect(doc.schemaVersion).toBe(1);
      expect(doc.entries).toEqual([]);
    });
  });

  describe("sortDsmEntries", () => {
    const entries = [
      createDefaultDsmEntry("2026-09-14"),
      createDefaultDsmEntry("2026-09-16"),
      createDefaultDsmEntry("2026-09-15"),
    ];

    it("sorts descending by default (newest first)", () => {
      const sorted = sortDsmEntries(entries, "desc");
      expect(sorted.map((e) => e.date)).toEqual(["2026-09-16", "2026-09-15", "2026-09-14"]);
    });

    it("sorts ascending when requested (oldest first)", () => {
      const sorted = sortDsmEntries(entries, "asc");
      expect(sorted.map((e) => e.date)).toEqual(["2026-09-14", "2026-09-15", "2026-09-16"]);
    });
  });
});
