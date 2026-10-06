import { describe, it, expect, beforeEach } from "vitest";
import { useGraphStore } from "../stores/useGraphStore";
import { mockIpcBridge } from "@infrastructure/tauri/mockIpcBridge";
import type { GeneralNote } from "@domain/note.types";

describe("useGraphStore", () => {
  beforeEach(() => {
    mockIpcBridge.reset();
    useGraphStore.setState({
      rawNodes: [],
      rawEdges: [],
      simulationNodes: [],
      simulationEdges: [],
      visibleNodes: [],
      visibleEdges: [],
      isLoading: false,
      physicsRunning: true,
      hoveredNodeId: null,
      selectedNodeId: null,
      connectedNeighborIds: new Set<string>(),
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  });

  it("loads backlinks graph and initializes physics nodes", async () => {
    const noteA: GeneralNote = {
      id: "note_a",
      title: "Consensus Algorithms",
      tags: ["distributed-systems"],
      pinned: false,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Read more on Raft",
                marks: [
                  {
                    type: "internalLink",
                    attrs: {
                      targetNoteId: "note_b",
                      originalTitle: "Raft Paper",
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      schemaVersion: 1,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    };

    const noteB: GeneralNote = {
      id: "note_b",
      title: "Raft Paper",
      tags: ["raft", "consensus"],
      pinned: false,
      content: { type: "doc", content: [] },
      schemaVersion: 1,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    };

    await mockIpcBridge.saveGeneralNote(noteA);
    await mockIpcBridge.saveGeneralNote(noteB);

    await useGraphStore.getState().loadGraph(800, 600);

    const state = useGraphStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.simulationNodes.length).toBeGreaterThanOrEqual(2);
    expect(state.visibleNodes.length).toBeGreaterThanOrEqual(2);

    const edge = state.simulationEdges.find(
      (e) => e.sourceId === "note_a" && e.targetId === "note_b"
    );
    expect(edge).toBeDefined();
  });

  it("filters visible nodes by search query dynamically", async () => {
    const noteA: GeneralNote = {
      id: "note_a",
      title: "PostgreSQL Indexing",
      tags: ["databases", "sql"],
      pinned: false,
      content: { type: "doc", content: [] },
      schemaVersion: 1,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    };
    const noteB: GeneralNote = {
      id: "note_b",
      title: "Kubernetes Ingress",
      tags: ["k8s", "networking"],
      pinned: false,
      content: { type: "doc", content: [] },
      schemaVersion: 1,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    };

    await mockIpcBridge.saveGeneralNote(noteA);
    await mockIpcBridge.saveGeneralNote(noteB);

    await useGraphStore.getState().loadGraph(800, 600);

    // Filter by query "postgres"
    useGraphStore.getState().updateFilters({ searchQuery: "postgres" });

    const visible = useGraphStore.getState().visibleNodes;
    expect(visible.some((n) => n.id === "note_a")).toBe(true);
    expect(visible.some((n) => n.id === "note_b")).toBe(false);
  });

  it("handles node selection, hover, and neighbor resolution", async () => {
    const noteA: GeneralNote = {
      id: "n_src",
      title: "Source Document",
      tags: ["source"],
      pinned: false,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Link",
                marks: [{ type: "internalLink", attrs: { targetNoteId: "n_dest" } }],
              },
            ],
          },
        ],
      },
      schemaVersion: 1,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    };
    const noteB: GeneralNote = {
      id: "n_dest",
      title: "Destination Document",
      tags: ["destination"],
      pinned: false,
      content: { type: "doc", content: [] },
      schemaVersion: 1,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    };

    await mockIpcBridge.saveGeneralNote(noteA);
    await mockIpcBridge.saveGeneralNote(noteB);
    await useGraphStore.getState().loadGraph(800, 600);

    // Select node
    useGraphStore.getState().setSelectedNode("n_src");
    expect(useGraphStore.getState().selectedNodeId).toBe("n_src");

    // Hover node and check neighbors
    useGraphStore.getState().setHoveredNode("n_src");
    const neighbors = useGraphStore.getState().connectedNeighborIds;
    expect(neighbors.has("n_src")).toBe(true);
    expect(neighbors.has("n_dest")).toBe(true);

    // Clear hover
    useGraphStore.getState().setHoveredNode(null);
    expect(useGraphStore.getState().hoveredNodeId).toBeNull();
    expect(useGraphStore.getState().connectedNeighborIds.size).toBe(0);
  });

  it("pins and unpins node coordinates", async () => {
    const note: GeneralNote = {
      id: "pin_me",
      title: "Pinned Node Test",
      tags: [],
      pinned: false,
      content: { type: "doc", content: [] },
      schemaVersion: 1,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    };
    await mockIpcBridge.saveGeneralNote(note);
    await useGraphStore.getState().loadGraph(800, 600);

    useGraphStore.getState().pinNode("pin_me", 350, 420);
    const nodeAfterPin = useGraphStore.getState().simulationNodes.find((n) => n.id === "pin_me");
    expect(nodeAfterPin?.isPinned).toBe(true);
    expect(nodeAfterPin?.x).toBe(350);
    expect(nodeAfterPin?.y).toBe(420);

    useGraphStore.getState().unpinNode("pin_me");
    const nodeAfterUnpin = useGraphStore.getState().simulationNodes.find((n) => n.id === "pin_me");
    expect(nodeAfterUnpin?.isPinned).toBe(false);
  });

  it("updates viewport zoom, pan, and resets correctly", () => {
    useGraphStore.getState().setZoom(1.8);
    useGraphStore.getState().setPan(150, -80);
    expect(useGraphStore.getState().zoom).toBe(1.8);
    expect(useGraphStore.getState().panX).toBe(150);
    expect(useGraphStore.getState().panY).toBe(-80);

    // Clamps excessive zoom
    useGraphStore.getState().setZoom(10.0);
    expect(useGraphStore.getState().zoom).toBe(4.0);

    useGraphStore.getState().resetViewport();
    expect(useGraphStore.getState().zoom).toBe(1);
    expect(useGraphStore.getState().panX).toBe(0);
    expect(useGraphStore.getState().panY).toBe(0);
  });
});
