import type {
  GraphNode,
  GraphEdge,
  SimulationNode,
  SimulationEdge,
  GraphPhysicsSettings,
  GraphFilterState,
} from "./graph.types";
import { DEFAULT_PHYSICS_SETTINGS } from "./graph.types";

/**
 * Initializes nodes on a 2D plane with initial layout and radii based on degree.
 */
export function initializeSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width = 800,
  height = 600
): { nodes: SimulationNode[]; edges: SimulationEdge[] } {
  const nodeMap = new Map<string, SimulationNode>();
  const centerX = width / 2;
  const centerY = height / 2;
  const n = nodes.length;

  nodes.forEach((node, i) => {
    // Distribute in a golden spiral initially to prevent overlapping singularities
    const angle = i * 2.3999632; // Golden ratio angle
    const radius = Math.min(width, height) * 0.35 * Math.sqrt((i + 1) / (n || 1));
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    // Node visual radius is proportional to total connectivity
    const degree = node.inDegree + node.outDegree;
    const visualRadius = Math.min(24, Math.max(8, 8 + Math.sqrt(degree) * 3));

    const simNode: SimulationNode = {
      ...node,
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      radius: visualRadius,
      isPinned: false,
    };
    nodeMap.set(node.id, simNode);
  });

  const simEdges: SimulationEdge[] = [];
  edges.forEach((edge) => {
    const source = nodeMap.get(edge.sourceId);
    const target = nodeMap.get(edge.targetId);
    if (source && target) {
      simEdges.push({
        source,
        target,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
      });
    }
  });

  return {
    nodes: Array.from(nodeMap.values()),
    edges: simEdges,
  };
}

/**
 * Steps the force-directed layout simulation forward by dt.
 * Returns total kinetic energy (can be used to pause when settled).
 */
export function stepPhysicsSimulation(
  nodes: SimulationNode[],
  edges: SimulationEdge[],
  centerX: number,
  centerY: number,
  settings: GraphPhysicsSettings = DEFAULT_PHYSICS_SETTINGS
): number {
  if (nodes.length === 0) return 0;

  // 1. Repulsion between all node pairs (Coulomb force)
  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i]!;
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeB = nodes[j]!;
      let dx = nodeB.x - nodeA.x;
      let dy = nodeB.y - nodeA.y;
      let distSq = dx * dx + dy * dy;
      if (distSq < 1) {
        dx = (Math.random() - 0.5) * 2;
        dy = (Math.random() - 0.5) * 2;
        distSq = 1;
      }
      const dist = Math.sqrt(distSq);
      // Repulsion force
      const force = settings.repulsion / (distSq + 100);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (!nodeA.isPinned) {
        nodeA.vx -= fx;
        nodeA.vy -= fy;
      }
      if (!nodeB.isPinned) {
        nodeB.vx += fx;
        nodeB.vy += fy;
      }
    }
  }

  // 2. Spring attraction along connected edges (Hooke's law)
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]!;
    const source = edge.source;
    const target = edge.target;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const displacement = dist - settings.springLength;
    const springForce = displacement * settings.springStrength;

    const fx = (dx / dist) * springForce;
    const fy = (dy / dist) * springForce;

    if (!source.isPinned) {
      source.vx += fx;
      source.vy += fy;
    }
    if (!target.isPinned) {
      target.vx -= fx;
      target.vy -= fy;
    }
  }

  // 3. Center gravity and integration
  let totalEnergy = 0;
  const maxVelocity = 15;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    if (node.isPinned) {
      node.vx = 0;
      node.vy = 0;
      continue;
    }

    // Pull toward center
    const toCenterX = centerX - node.x;
    const toCenterY = centerY - node.y;
    node.vx += toCenterX * settings.centerGravity;
    node.vy += toCenterY * settings.centerGravity;

    // Apply damping
    node.vx *= settings.damping;
    node.vy *= settings.damping;

    // Clamp max velocity
    const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
    if (speed > maxVelocity) {
      node.vx = (node.vx / speed) * maxVelocity;
      node.vy = (node.vy / speed) * maxVelocity;
    }

    // Update position
    node.x += node.vx;
    node.y += node.vy;

    totalEnergy += speed * speed;
  }

  return totalEnergy;
}

/**
 * Filters the graph according to search query, document types, tags, and minimum degree.
 */
export function filterGraphNodesAndEdges(
  nodes: SimulationNode[],
  edges: SimulationEdge[],
  filters: GraphFilterState
): { visibleNodes: SimulationNode[]; visibleEdges: SimulationEdge[] } {
  const query = filters.searchQuery.trim().toLowerCase();
  const selectedTypes = new Set(filters.selectedDocTypes);
  const selectedTags = new Set(filters.selectedTags);

  const visibleNodes = nodes.filter((node) => {
    // 1. Doc Type filter
    if (selectedTypes.size > 0 && !selectedTypes.has(node.docType)) {
      return false;
    }

    // 2. Minimum connections filter
    const degree = node.inDegree + node.outDegree;
    if (degree < filters.minConnections) {
      return false;
    }

    // 3. Orphan filter
    if (!filters.showOrphans && degree === 0) {
      return false;
    }

    // 4. Tag filter
    if (selectedTags.size > 0) {
      const hasMatchingTag = node.tags.some((t) => selectedTags.has(t));
      if (!hasMatchingTag) return false;
    }

    // 5. Search query filter
    if (query) {
      const matchesTitle = node.title.toLowerCase().includes(query);
      const matchesTags = node.tags.some((t) => t.toLowerCase().includes(query));
      if (!matchesTitle && !matchesTags) return false;
    }

    return true;
  });

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

  // Edges are visible only if both source and target are visible
  const visibleEdges = edges.filter(
    (e) => visibleNodeIds.has(e.sourceId) && visibleNodeIds.has(e.targetId)
  );

  return { visibleNodes, visibleEdges };
}

/**
 * Returns neighbor node IDs directly connected to the specified node (1st degree).
 */
export function getConnectedNodeIds(nodeId: string, edges: SimulationEdge[]): Set<string> {
  const neighbors = new Set<string>();
  neighbors.add(nodeId);

  for (const edge of edges) {
    if (edge.sourceId === nodeId) {
      neighbors.add(edge.targetId);
    } else if (edge.targetId === nodeId) {
      neighbors.add(edge.sourceId);
    }
  }

  return neighbors;
}
