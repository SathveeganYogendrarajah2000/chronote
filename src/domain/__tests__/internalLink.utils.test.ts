import { describe, it, expect } from "vitest";
import {
  parseInternalLinkText,
  getInternalLinkDisplayText,
  searchLinkCandidates,
} from "../internalLink.utils";

describe("internalLink.utils", () => {
  describe("parseInternalLinkText", () => {
    it("parses simple note title", () => {
      const result = parseInternalLinkText("Spring Security Config");
      expect(result).toEqual({
        targetTitle: "Spring Security Config",
      });
    });

    it("parses note title with alias separated by pipe", () => {
      const result = parseInternalLinkText("Spring Security Config | Auth Guide");
      expect(result).toEqual({
        targetTitle: "Spring Security Config",
        alias: "Auth Guide",
      });
    });

    it("handles multiple pipes preserving them in the alias", () => {
      const result = parseInternalLinkText("Doc Title | Label | Extra");
      expect(result).toEqual({
        targetTitle: "Doc Title",
        alias: "Label | Extra",
      });
    });

    it("returns null for empty strings", () => {
      expect(parseInternalLinkText("")).toBeNull();
      expect(parseInternalLinkText("   ")).toBeNull();
      expect(parseInternalLinkText(" | alias")).toBeNull();
    });
  });

  describe("getInternalLinkDisplayText", () => {
    it("returns alias if present", () => {
      expect(getInternalLinkDisplayText("Original Title", "Custom Alias")).toBe("Custom Alias");
    });

    it("returns title if alias is empty or missing", () => {
      expect(getInternalLinkDisplayText("Original Title")).toBe("Original Title");
      expect(getInternalLinkDisplayText("Original Title", "  ")).toBe("Original Title");
    });
  });

  describe("searchLinkCandidates", () => {
    const candidates = [
      { id: "not_1", title: "Spring Boot Security", tags: ["backend", "java"] },
      { id: "not_2", title: "React State Architecture", tags: ["frontend", "react"] },
      { id: "not_3", title: "Postgres Index Optimization", tags: ["database", "sql"] },
    ];

    it("filters candidates by title substring", () => {
      const results = searchLinkCandidates(candidates, "state");
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("not_2");
    });

    it("filters candidates by tag substring", () => {
      const results = searchLinkCandidates(candidates, "sql");
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("not_3");
    });

    it("returns all candidates when query is empty", () => {
      expect(searchLinkCandidates(candidates, "")).toHaveLength(3);
    });
  });
});
