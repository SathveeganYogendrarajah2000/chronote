export type GraphDocType = "general" | "dsm" | "courses";

export interface GraphNode {
  id: string;
  title: string;
  docType: GraphDocType;
  tags: string[];
  updatedAt?: string | null;
  inDegree: number;
  outDegree: number;
}

export interface GraphEdge {
  sourceId: string;
  sourceTitle: string;
  sourceEntryId?: string | null;
  sourceEntryDate?: string | null;
  targetId: string;
  targetTitle: string;
}

export interface BacklinksGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SimulationNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isPinned?: boolean;
}

export interface SimulationEdge {
  source: SimulationNode;
  target: SimulationNode;
  sourceId: string;
  targetId: string;
}

export interface GraphFilterState {
  searchQuery: string;
  selectedDocTypes: GraphDocType[];
  selectedTags: string[];
  minConnections: number;
  showOrphans: boolean;
}

export interface GraphPhysicsSettings {
  repulsion: number;
  springLength: number;
  springStrength: number;
  damping: number;
  centerGravity: number;
}

export const DEFAULT_PHYSICS_SETTINGS: GraphPhysicsSettings = {
  repulsion: 1200,
  springLength: 90,
  springStrength: 0.05,
  damping: 0.88,
  centerGravity: 0.03,
};
