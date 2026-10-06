import { describe, it, expect } from "vitest";
import {
  analyzeGeneralNoteDiff,
  buildMergedGeneralNote,
  buildMergedDsmDocument,
} from "../conflictMerge";
import type { GeneralNote } from "../note.types";
import type { DsmDocument } from "../dsm.types";

describe("3-Way Conflict Resolution Domain Engine", () => {
  const baseLocalNote: GeneralNote = {
    id: "not_merge_1",
    title: "Kubernetes Operator Architecture",
    tags: ["k8s", "architecture"],
    pinned: false,
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { id: "p1" },
          content: [{ type: "text", text: "Controllers reconcile desired state." }],
        },
        {
          type: "paragraph",
          attrs: { id: "p2" },
          content: [{ type: "text", text: "CRDs define the custom domain resources." }],
        },
      ],
    },
    schemaVersion: 1,
    createdAt: "2026-10-01T08:00:00.000Z",
    updatedAt: "2026-10-06T10:00:00.000Z",
  };

  describe("analyzeGeneralNoteDiff", () => {
    it("reports zero conflicts when documents are identical", () => {
      const diff = analyzeGeneralNoteDiff(baseLocalNote, { ...baseLocalNote });
      expect(diff.hasTitleConflict).toBe(false);
      expect(diff.hasTagConflict).toBe(false);
      expect(diff.hasContentConflict).toBe(false);
      expect(diff.conflictingBlocks).toHaveLength(0);
      expect(diff.cleanMergedBlocksCount).toBe(2);
    });

    it("detects title discrepancy", () => {
      const remoteNote: GeneralNote = {
        ...baseLocalNote,
        title: "Kubernetes Operator Deep Dive (Remote)",
      };
      const diff = analyzeGeneralNoteDiff(baseLocalNote, remoteNote);
      expect(diff.hasTitleConflict).toBe(true);
      expect(diff.localTitle).toBe("Kubernetes Operator Architecture");
      expect(diff.remoteTitle).toBe("Kubernetes Operator Deep Dive (Remote)");
    });

    it("detects tag discrepancies", () => {
      const remoteNote: GeneralNote = {
        ...baseLocalNote,
        tags: ["k8s", "golang", "devops"],
      };
      const diff = analyzeGeneralNoteDiff(baseLocalNote, remoteNote);
      expect(diff.hasTagConflict).toBe(true);
      expect(diff.localTags).toEqual(["k8s", "architecture"]);
      expect(diff.remoteTags).toEqual(["k8s", "golang", "devops"]);
    });

    it("detects content conflicts on changed blocks", () => {
      const remoteNote: GeneralNote = {
        ...baseLocalNote,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              attrs: { id: "p1" },
              content: [{ type: "text", text: "Controllers reconcile desired state." }],
            },
            {
              type: "paragraph",
              attrs: { id: "p2" },
              content: [{ type: "text", text: "CRDs define the custom domain schema via OpenAPI v3." }],
            },
          ],
        },
      };

      const diff = analyzeGeneralNoteDiff(baseLocalNote, remoteNote);
      expect(diff.hasContentConflict).toBe(true);
      expect(diff.conflictingBlocks).toHaveLength(1);
      expect(diff.conflictingBlocks[0]!.localText).toBe("CRDs define the custom domain resources.");
      expect(diff.conflictingBlocks[0]!.remoteText).toBe("CRDs define the custom domain schema via OpenAPI v3.");
      expect(diff.cleanMergedBlocksCount).toBe(1); // p1 is identical
    });
  });

  describe("buildMergedGeneralNote", () => {
    it("resolves title according to wizard choice", () => {
      const remoteNote: GeneralNote = {
        ...baseLocalNote,
        title: "Remote Title",
      };
      const diff = analyzeGeneralNoteDiff(baseLocalNote, remoteNote);

      // 1. Choose local
      const mergedLocal = buildMergedGeneralNote(baseLocalNote, remoteNote, {
        ...diff,
        chosenTitleChoice: "local",
      });
      expect(mergedLocal.title).toBe(baseLocalNote.title);

      // 2. Choose remote
      const mergedRemote = buildMergedGeneralNote(baseLocalNote, remoteNote, {
        ...diff,
        chosenTitleChoice: "remote",
      });
      expect(mergedRemote.title).toBe("Remote Title");

      // 3. Choose custom
      const mergedCustom = buildMergedGeneralNote(baseLocalNote, remoteNote, {
        ...diff,
        chosenTitleChoice: "custom",
        customTitle: "Harmonized Title (Custom)",
      });
      expect(mergedCustom.title).toBe("Harmonized Title (Custom)");
    });

    it("resolves tags according to wizard choice (union, local, remote)", () => {
      const remoteNote: GeneralNote = {
        ...baseLocalNote,
        tags: ["golang", "cloud-native"],
      };
      const diff = analyzeGeneralNoteDiff(baseLocalNote, remoteNote);

      // Choose union
      const mergedUnion = buildMergedGeneralNote(baseLocalNote, remoteNote, {
        ...diff,
        chosenTagsChoice: "union",
      });
      expect(mergedUnion.tags.sort()).toEqual(["architecture", "cloud-native", "golang", "k8s"]);

      // Choose remote
      const mergedRemote = buildMergedGeneralNote(baseLocalNote, remoteNote, {
        ...diff,
        chosenTagsChoice: "remote",
      });
      expect(mergedRemote.tags).toEqual(["golang", "cloud-native"]);
    });

    it("merges content blocks: keeping both versions or custom text", () => {
      const remoteNote: GeneralNote = {
        ...baseLocalNote,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              attrs: { id: "p1" },
              content: [{ type: "text", text: "P1 Remote Version" }],
            },
          ],
        },
      };

      const diff = analyzeGeneralNoteDiff(baseLocalNote, remoteNote);

      // Test choosing 'both'
      diff.conflictingBlocks[0]!.chosen = "both";
      const mergedBoth = buildMergedGeneralNote(baseLocalNote, remoteNote, diff);
      const blocksBoth = mergedBoth.content?.content || [];
      // p1 local + p1 remote + p2 local appended
      expect(blocksBoth.length).toBe(3);

      // Test choosing 'custom'
      diff.conflictingBlocks[0]!.chosen = "custom";
      diff.conflictingBlocks[0]!.customText = "Hand-crafted resolution";
      const mergedCustom = buildMergedGeneralNote(baseLocalNote, remoteNote, diff);
      const customBlocks = mergedCustom.content?.content || [];
      const firstBlock = customBlocks[0];
      expect(firstBlock?.content?.[0]?.text).toBe("Hand-crafted resolution");
    });
  });

  describe("buildMergedDsmDocument", () => {
    it("merges distinct dates without conflict", () => {
      const localDoc: DsmDocument = {
        id: "dsm_master",
        title: "Daily Stand-up Master Journal",
        schemaVersion: 1,
        entries: [
          {
            id: "dsm_1",
            date: "2026-10-05",
            tags: ["daily"],
            collapsed: false,
            content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Day 1" }] }] },
            createdAt: "2026-10-05T09:00:00.000Z",
            updatedAt: "2026-10-05T09:00:00.000Z",
          },
        ],
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-05T09:00:00.000Z",
      };

      const remoteDoc: DsmDocument = {
        id: "dsm_master",
        title: "Daily Stand-up Master Journal",
        schemaVersion: 1,
        entries: [
          {
            id: "dsm_2",
            date: "2026-10-06",
            tags: ["standup"],
            collapsed: false,
            content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Day 2" }] }] },
            createdAt: "2026-10-06T09:00:00.000Z",
            updatedAt: "2026-10-06T09:00:00.000Z",
          },
        ],
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-06T09:00:00.000Z",
      };

      const merged = buildMergedDsmDocument(localDoc, remoteDoc);
      expect(merged.entries).toHaveLength(2);
      // Sorted descending: 2026-10-06 first, 2026-10-05 second
      expect(merged.entries[0]!.date).toBe("2026-10-06");
      expect(merged.entries[1]!.date).toBe("2026-10-05");
    });

    it("unions tags and combines content blocks when same date exists in both", () => {
      const localDoc: DsmDocument = {
        id: "dsm_master",
        title: "Daily Stand-up Master Journal",
        schemaVersion: 1,
        entries: [
          {
            id: "dsm_same",
            date: "2026-10-06",
            tags: ["local-tag"],
            collapsed: false,
            content: {
              type: "doc",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Local tasks completed." }] }],
            },
            createdAt: "2026-10-06T09:00:00.000Z",
            updatedAt: "2026-10-06T09:00:00.000Z",
          },
        ],
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-06T09:00:00.000Z",
      };

      const remoteDoc: DsmDocument = {
        id: "dsm_master",
        title: "Daily Stand-up Master Journal",
        schemaVersion: 1,
        entries: [
          {
            id: "dsm_same_remote",
            date: "2026-10-06",
            tags: ["remote-tag"],
            collapsed: false,
            content: {
              type: "doc",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Remote notes from travel." }] }],
            },
            createdAt: "2026-10-06T11:00:00.000Z",
            updatedAt: "2026-10-06T11:00:00.000Z",
          },
        ],
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-06T11:00:00.000Z",
      };

      const merged = buildMergedDsmDocument(localDoc, remoteDoc);
      expect(merged.entries).toHaveLength(1);
      const entry = merged.entries[0]!;
      expect(entry.tags.sort()).toEqual(["local-tag", "remote-tag"]);
      expect(entry.content.content).toHaveLength(2);
      expect(entry.updatedAt).toBe("2026-10-06T11:00:00.000Z");
    });
  });
});
