import { describe, it, expect } from "vitest";
import {
  initializeSimulation,
  stepPhysicsSimulation,
  filterGraphNodesAndEdges,
  getConnectedNodeIds,
} from "../graph.physics";
import type { GraphNode, GraphEdge, GraphFilterState } from "../graph.types";
import { DEFAULT_PHYSICS_SETTINGS } from "../graph.types";

describe("Backlinks Graph Domain & Physics Engine", () => {
  const sampleNodes: GraphNode[] = [
    {
      id: "note_1",
      title: "Distributed Systems Overview",
      docType: "general",
      tags: ["systems", "architecture"],
      inDegree: 1,
      outDegree: 2,
    },
    {
      id: "note_2",
      title: "Raft Consensus Algorithm",
      docType: "general",
      tags: ["consensus", "raft"],
      inDegree: 1,
      outDegree: 0,
    },
    {
      id: "dsm_doc",
      title: "Daily Stand-up Master Journal",
      docType: "dsm",
      tags: ["journal"],
      inDegree: 0,
      outDegree: 1,
    },
    {
      id: "orphan_note",
      title: "Isolated Scratchpad",
      docType: "general",
      tags: ["scratch"],
      inDegree: 0,
      outDegree: 0,
    },
  ];

  const sampleEdges: GraphEdge[] = [
    {
      sourceId: "note_1",
      sourceTitle: "Distributed Systems Overview",
      targetId: "note_2",
      targetTitle: "Raft Consensus Algorithm",
    },
    {
      sourceId: "dsm_doc",
      sourceTitle: "Daily Stand-up Master Journal",
      targetId: "note_1",
      targetTitle: "Distributed Systems Overview",
    },
  ];

  describe("initializeSimulation", () => {
    it("initializes simulation nodes with valid coordinates and radii", () => {
      const { nodes, edges } = initializeSimulation(sampleNodes, sampleEdges, 800, 600);

      expect(nodes).toHaveLength(4);
      expect(edges).toHaveLength(2);

      // Check node 1 radius (degree = 3) vs orphan (degree = 0)
      const simNode1 = nodes.find((n) => n.id === "note_1")!;
      const simOrphan = nodes.find((n) => n.id === "orphan_note")!;

      expect(simNode1.radius).toBeGreaterThan(simOrphan.radius);
      expect(Number.isFinite(simNode1.x)).toBe(true);
      expect(Number.isFinite(simNode1.y)).toBe(true);
      expect(simNode1.isPinned).toBe(false);

      // Edge references point to valid node objects
      expect(edges[0]!.source.id).toBe("note_1");
      expect(edges[0]!.target.id).toBe("note_2");
    });
  });

  describe("stepPhysicsSimulation", () => {
    it("moves nodes via forces and computes kinetic energy", () => {
      const { nodes, edges } = initializeSimulation(sampleNodes, sampleEdges, 800, 600);

      const energy = stepPhysicsSimulation(nodes, edges, 400, 300, DEFAULT_PHYSICS_SETTINGS);
      expect(Number.isFinite(energy)).toBe(true);
      expect(energy).toBeGreaterThanOrEqual(0);
    });

    it("respects pinned nodes during physics integration", () => {
      const { nodes, edges } = initializeSimulation(sampleNodes, sampleEdges, 800, 600);
      const pinned = nodes[0]!;
      pinned.isPinned = true;
      const initialX = 500;
      const initialY = 500;
      pinned.x = initialX;
      pinned.y = initialY;

      stepPhysicsSimulation(nodes, edges, 400, 300, DEFAULT_PHYSICS_SETTINGS);

      expect(pinned.x).toBe(initialX);
      expect(pinned.y).toBe(initialY);
      expect(pinned.vx).toBe(0);
      expect(pinned.vy).toBe(0);
    });
  });

  describe("filterGraphNodesAndEdges", () => {
    const defaultFilters: GraphFilterState = {
      searchQuery: "",
      selectedDocTypes: ["general", "dsm", "courses"],
      selectedTags: [],
      minConnections: 0,
      showOrphans: true,
    };

    it("filters nodes by search query matching title or tag", () => {
      const { nodes, edges } = initializeSimulation(sampleNodes, sampleEdges, 800, 600);

      // Search by title snippet "Raft"
      const res1 = filterGraphNodesAndEdges(nodes, edges, {
        ...defaultFilters,
        searchQuery: "raft",
      });
      expect(res1.visibleNodes).toHaveLength(1);
      expect(res1.visibleNodes[0]!.id).toBe("note_2");

      // Search by tag "journal"
      const res2 = filterGraphNodesAndEdges(nodes, edges, {
        ...defaultFilters,
        searchQuery: "journal",
      });
      expect(res2.visibleNodes).toHaveLength(1);
      expect(res2.visibleNodes[0]!.id).toBe("dsm_doc");
    });

    it("filters nodes by document type", () => {
      const { nodes, edges } = initializeSimulation(sampleNodes, sampleEdges, 800, 600);

      const res = filterGraphNodesAndEdges(nodes, edges, {
        ...defaultFilters,
        selectedDocTypes: ["dsm"],
      });
      expect(res.visibleNodes).toHaveLength(1);
      expect(res.visibleNodes[0]!.id).toBe("dsm_doc");
      // Edges connecting to hidden notes are hidden
      expect(res.visibleEdges).toHaveLength(0);
    });

    it("filters orphan nodes when showOrphans is false", () => {
      const { nodes, edges } = initializeSimulation(sampleNodes, sampleEdges, 800, 600);

      const res = filterGraphNodesAndEdges(nodes, edges, {
        ...defaultFilters,
        showOrphans: false,
      });
      expect(res.visibleNodes.some((n) => n.id === "orphan_note")).toBe(false);
      expect(res.visibleNodes).toHaveLength(3);
    });

    it("filters nodes by minimum connection degree", () => {
      const { nodes, edges } = initializeSimulation(sampleNodes, sampleEdges, 800, 600);

      // Only note_1 has in+out degree >= 2 (degree = 3)
      const res = filterGraphNodesAndEdges(nodes, edges, {
        ...defaultFilters,
        minConnections: 2,
      });
      expect(res.visibleNodes).toHaveLength(1);
      expect(res.visibleNodes[0]!.id).toBe("note_1");
    });
  });

  describe("getConnectedNodeIds", () => {
    it("finds all 1-hop connected neighbors", () => {
      const { edges } = initializeSimulation(sampleNodes, sampleEdges, 800, 600);

      // note_1 is connected to note_2 and dsm_doc
      const neighbors = getConnectedNodeIds("note_1", edges);
      expect(neighbors.has("note_1")).toBe(true);
      expect(neighbors.has("note_2")).toBe(true);
      expect(neighbors.has("dsm_doc")).toBe(true);
      expect(neighbors.has("orphan_note")).toBe(false);
    });
  });
});
