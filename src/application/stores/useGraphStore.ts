import { create } from "zustand";
import type {
  GraphNode,
  GraphEdge,
  SimulationNode,
  SimulationEdge,
  GraphFilterState,
} from "@domain/graph.types";
import {
  initializeSimulation,
  stepPhysicsSimulation,
  filterGraphNodesAndEdges,
  getConnectedNodeIds,
} from "@domain/graph.physics";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";

interface GraphState {
  rawNodes: GraphNode[];
  rawEdges: GraphEdge[];
  simulationNodes: SimulationNode[];
  simulationEdges: SimulationEdge[];
  visibleNodes: SimulationNode[];
  visibleEdges: SimulationEdge[];

  isLoading: boolean;
  physicsRunning: boolean;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  connectedNeighborIds: Set<string>;

  filters: GraphFilterState;
  zoom: number;
  panX: number;
  panY: number;

  loadGraph: (width?: number, height?: number) => Promise<void>;
  stepPhysics: (centerX: number, centerY: number) => number;
  setHoveredNode: (nodeId: string | null) => void;
  setSelectedNode: (nodeId: string | null) => void;
  updateFilters: (partial: Partial<GraphFilterState>) => void;
  setPhysicsRunning: (running: boolean) => void;
  setZoom: (zoom: number) => void;
  setPan: (panX: number, panY: number) => void;
  resetViewport: () => void;
  pinNode: (nodeId: string, x: number, y: number) => void;
  unpinNode: (nodeId: string) => void;
}

const INITIAL_FILTERS: GraphFilterState = {
  searchQuery: "",
  selectedDocTypes: ["general", "dsm", "courses"],
  selectedTags: [],
  minConnections: 0,
  showOrphans: true,
};

export const useGraphStore = create<GraphState>((set, get) => ({
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

  filters: { ...INITIAL_FILTERS },
  zoom: 1,
  panX: 0,
  panY: 0,

  loadGraph: async (width = 900, height = 650) => {
    set({ isLoading: true });
    try {
      const graphData = await ipcBridge.getBacklinksGraph();
      const { nodes: simNodes, edges: simEdges } = initializeSimulation(
        graphData.nodes,
        graphData.edges,
        width,
        height
      );

      const { visibleNodes, visibleEdges } = filterGraphNodesAndEdges(
        simNodes,
        simEdges,
        get().filters
      );

      set({
        rawNodes: graphData.nodes,
        rawEdges: graphData.edges,
        simulationNodes: simNodes,
        simulationEdges: simEdges,
        visibleNodes,
        visibleEdges,
        isLoading: false,
        physicsRunning: true,
      });
    } catch (err) {
      console.error("Failed to load backlinks graph:", err);
      set({ isLoading: false });
    }
  },

  stepPhysics: (centerX: number, centerY: number) => {
    const { simulationNodes, simulationEdges, physicsRunning } = get();
    if (!physicsRunning) return 0;
    return stepPhysicsSimulation(simulationNodes, simulationEdges, centerX, centerY);
  },

  setHoveredNode: (nodeId: string | null) => {
    if (!nodeId) {
      set({ hoveredNodeId: null, connectedNeighborIds: new Set() });
      return;
    }
    const neighbors = getConnectedNodeIds(nodeId, get().simulationEdges);
    set({ hoveredNodeId: nodeId, connectedNeighborIds: neighbors });
  },

  setSelectedNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  updateFilters: (partial: Partial<GraphFilterState>) => {
    const nextFilters = { ...get().filters, ...partial };
    const { visibleNodes, visibleEdges } = filterGraphNodesAndEdges(
      get().simulationNodes,
      get().simulationEdges,
      nextFilters
    );
    set({ filters: nextFilters, visibleNodes, visibleEdges });
  },

  setPhysicsRunning: (running: boolean) => set({ physicsRunning: running }),

  setZoom: (zoom: number) => {
    const clamped = Math.max(0.2, Math.min(4.0, zoom));
    set({ zoom: clamped });
  },

  setPan: (panX: number, panY: number) => set({ panX, panY }),

  resetViewport: () => set({ zoom: 1, panX: 0, panY: 0 }),

  pinNode: (nodeId: string, x: number, y: number) => {
    const node = get().simulationNodes.find((n) => n.id === nodeId);
    if (node) {
      node.x = x;
      node.y = y;
      node.isPinned = true;
    }
  },

  unpinNode: (nodeId: string) => {
    const node = get().simulationNodes.find((n) => n.id === nodeId);
    if (node) {
      node.isPinned = false;
    }
  },
}));
