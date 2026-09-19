import { describe, it, expect, beforeEach } from "vitest";
import { useSearchStore } from "../stores/useSearchStore";
import { mockIpcBridge } from "@infrastructure/tauri/mockIpcBridge";

describe("useSearchStore", () => {
  beforeEach(async () => {
    useSearchStore.getState().clearSearch();
    await mockIpcBridge.createWorkspace("test-path", "Test Workspace");
    await mockIpcBridge.saveGeneralNote({
      id: "not_1",
      schemaVersion: 1,
      title: "Spring Security Note",
      tags: ["springboot", "backend"],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { id: "blk_1" },
            content: [{ type: "text", text: "Configuring JWT filter." }],
          },
        ],
      },
      pinned: false,
      createdAt: "2026-09-16T10:00:00Z",
      updatedAt: "2026-09-16T10:00:00Z",
    });
  });

  it("updates query and parses AST", () => {
    const store = useSearchStore.getState();
    store.setQuery("tag:springboot JWT");

    expect(useSearchStore.getState().rawQuery).toBe("tag:springboot JWT");
    expect(useSearchStore.getState().ast.tags).toEqual(["springboot"]);
    expect(useSearchStore.getState().ast.textTokens).toEqual(["JWT"]);
  });

  it("executes search and returns highlighted matches", async () => {
    const store = useSearchStore.getState();
    store.setQuery("JWT");
    await store.executeSearch();

    const state = useSearchStore.getState();
    expect(state.results.length).toBeGreaterThan(0);
    expect(state.results[0]?.documentTitle).toBe("Spring Security Note");
    expect(state.results[0]?.excerpt).toContain("<mark>JWT</mark>");
    expect(state.selectedIndex).toBe(0);
  });

  it("cycles selection with next and prev", async () => {
    // Add another note
    await mockIpcBridge.saveGeneralNote({
      id: "not_2",
      schemaVersion: 1,
      title: "JWT Token Expiry Note",
      tags: ["jwt"],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { id: "blk_2" },
            content: [{ type: "text", text: "JWT refresh handling." }],
          },
        ],
      },
      pinned: false,
      createdAt: "2026-09-16T10:00:00Z",
      updatedAt: "2026-09-16T10:00:00Z",
    });

    const store = useSearchStore.getState();
    store.setQuery("JWT");
    await store.executeSearch();

    const state = useSearchStore.getState();
    expect(state.results.length).toBe(2);
    expect(state.selectedIndex).toBe(0);

    store.selectNextResult();
    expect(useSearchStore.getState().selectedIndex).toBe(1);

    store.selectNextResult();
    expect(useSearchStore.getState().selectedIndex).toBe(0); // Wrapped around

    store.selectPrevResult();
    expect(useSearchStore.getState().selectedIndex).toBe(1);
  });

  it("appends filter token to current query", () => {
    const store = useSearchStore.getState();
    store.setQuery("auth");
    store.appendFilter("type:code");

    expect(useSearchStore.getState().rawQuery).toBe("auth type:code");
    expect(useSearchStore.getState().ast.blockTypes).toEqual(["code"]);
  });

  it("clears search state cleanly", () => {
    const store = useSearchStore.getState();
    store.setQuery("test query");
    store.clearSearch();

    const state = useSearchStore.getState();
    expect(state.rawQuery).toBe("");
    expect(state.results).toEqual([]);
    expect(state.selectedIndex).toBe(-1);
  });
});
