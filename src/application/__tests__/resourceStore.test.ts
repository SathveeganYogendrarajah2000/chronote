import { describe, it, expect, beforeEach } from "vitest";
import { useResourceStore } from "../stores/useResourceStore";
import { mockIpcBridge } from "@infrastructure/tauri/mockIpcBridge";

describe("useResourceStore", () => {
  beforeEach(async () => {
    useResourceStore.setState({
      activeTab: "code",
      scope: "activeDoc",
      filterQuery: "",
      resources: [],
      backlinks: [],
      isLoading: false,
      error: null,
    });

    await mockIpcBridge.createWorkspace("test-path", "Test Workspace");
    await mockIpcBridge.saveGeneralNote({
      id: "not_1",
      schemaVersion: 1,
      title: "Security Note",
      tags: ["security"],
      content: {
        type: "doc",
        content: [
          {
            type: "codeBlock",
            attrs: { id: "blk_c1", language: "rust" },
            content: [{ type: "text", text: "let auth = true;" }],
          },
          {
            type: "paragraph",
            attrs: { id: "blk_p1" },
            content: [
              {
                type: "text",
                text: "External Link",
                marks: [{ type: "link", attrs: { href: "https://example.com" } }],
              },
              {
                type: "text",
                text: "Target Link",
                marks: [
                  {
                    type: "internalLink",
                    attrs: { targetNoteId: "not_target", originalTitle: "Target Note" },
                  },
                ],
              },
            ],
          },
        ],
      },
      pinned: false,
      createdAt: "2026-09-16T10:00:00Z",
      updatedAt: "2026-09-16T10:00:00Z",
    });
  });

  it("loads resources for active document", async () => {
    const store = useResourceStore.getState();
    await store.loadResources("not_1");

    const state = useResourceStore.getState();
    expect(state.resources.length).toBeGreaterThan(0);
    const codeItem = state.resources.find((r) => r.resourceType === "code");
    expect(codeItem).toBeDefined();
    expect(codeItem?.language).toBe("rust");
  });

  it("loads backlinks for target note", async () => {
    const store = useResourceStore.getState();
    await store.loadBacklinks("not_target");

    const state = useResourceStore.getState();
    expect(state.backlinks.length).toBe(1);
    expect(state.backlinks[0]?.sourceDocumentId).toBe("not_1");
  });

  it("switches tabs and scopes", () => {
    const store = useResourceStore.getState();
    store.setActiveTab("link");
    expect(useResourceStore.getState().activeTab).toBe("link");

    store.setScope("workspace");
    expect(useResourceStore.getState().scope).toBe("workspace");

    store.setFilterQuery("rust");
    expect(useResourceStore.getState().filterQuery).toBe("rust");
  });
});
