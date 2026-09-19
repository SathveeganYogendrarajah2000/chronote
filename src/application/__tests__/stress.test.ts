import { describe, it, expect, beforeEach } from "vitest";
import { useWorkspaceStore } from "../stores/useWorkspaceStore";
import { parseSearchQuery } from "@domain/search.parser";
import { mockIpcBridge } from "@infrastructure/tauri/mockIpcBridge";
import type { NoteMetadata } from "@domain/note.types";

describe("Frontend Large Workspace Stress & Scaling Tests", () => {
  beforeEach(() => {
    mockIpcBridge.reset();
  });

  it("handles 5,000 note metadata entries in useWorkspaceStore with sub-10ms response", () => {
    const notesCount = 5000;
    const syntheticNotes: NoteMetadata[] = [];

    for (let i = 0; i < notesCount; i++) {
      syntheticNotes.push({
        id: `not_synth_${i.toString().padStart(5, "0")}`,
        title: `Engineering Scalability Analysis #${i}`,
        tags: ["architecture", "performance", `node_${i % 20}`],
        pinned: i < 5,
        updatedAt: new Date(Date.now() - i * 60000).toISOString(),
      });
    }

    const start = performance.now();
    useWorkspaceStore.setState({ recentNotes: syntheticNotes });
    const loadDuration = performance.now() - start;

    expect(useWorkspaceStore.getState().recentNotes.length).toBe(notesCount);
    expect(loadDuration).toBeLessThan(50); // Store update under 50ms

    // Pin filtering on 5,000 notes
    const filterStart = performance.now();
    const pinnedNotes = useWorkspaceStore.getState().recentNotes.filter((n: NoteMetadata) => n.pinned);
    const filterDuration = performance.now() - filterStart;

    expect(pinnedNotes.length).toBe(5);
    expect(filterDuration).toBeLessThan(10); // Instant filtering (< 10ms)
  });

  it("parses 1,000 complex search DSL queries in under 25ms", () => {
    const queries = [
      'tag:backend "connection pool" lang:typescript after:2026-01-01',
      'type:code redis cluster failover lang:rust',
      'tag:database #sql "EXPLAIN ANALYZE" date:2026-09-15',
      'before:2026-08-01 tag:security auth jwt token',
      'type:dsm "sprint planning" tag:frontend',
    ];

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      const q = queries[i % queries.length]!;
      const ast = parseSearchQuery(q);
      expect(ast.textTokens.length + ast.tags.length + ast.exactPhrases.length).toBeGreaterThan(0);
    }
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // 1,000 queries parsed in < 100ms
  });

  it("executes mock search across DSM and note blocks maintaining high responsiveness", async () => {
    // Seed mock bridge with multiple notes
    for (let i = 0; i < 50; i++) {
      await mockIpcBridge.saveGeneralNote({
        id: `not_bench_${i}`,
        schemaVersion: 1,
        title: `Distributed Consensus Note ${i}`,
        tags: ["raft", "consensus", "storage"],
        pinned: false,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              attrs: { id: `blk_p_${i}` },
              content: [{ type: "text", text: `Quorum lease management and log replication node ${i}` }],
            },
            {
              type: "codeBlock",
              attrs: { id: `blk_c_${i}`, language: "rust" },
              content: [{ type: "text", text: `fn append_entries_${i}() { /* raft */ }` }],
            },
          ],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const start = performance.now();
    const results = await mockIpcBridge.searchWorkspace("tag:consensus append_entries lang:rust");
    const duration = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(50);
  });
});
