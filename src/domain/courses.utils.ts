import type {
  CoursesDocument,
  LearningTopic,
  LearningResource,
  TopicTreeNode,
  TopicPathItem,
  LearningPlatform,
  LearningStatus,
} from "./courses.types";
import { generateId } from "./id.utils";
import { normalizeTagList } from "./tagNormalizer";

export function createDefaultCoursesDocument(): CoursesDocument {
  const now = new Date().toISOString();
  return {
    id: "courses_master",
    schemaVersion: 1,
    title: "Courses & Topics",
    createdAt: now,
    updatedAt: now,
    topics: [],
    resources: [],
  };
}

export function createLearningTopic(
  title: string,
  parentId: string | null = null,
  description: string = "",
  tags: string[] = []
): LearningTopic {
  const now = new Date().toISOString();
  return {
    id: generateId("top"),
    parentId,
    title: title.trim() || "Untitled Topic",
    description: description.trim(),
    tags: normalizeTagList(tags),
    createdAt: now,
    updatedAt: now,
  };
}

export function createLearningResource(data: {
  topicId: string;
  title: string;
  platform?: LearningPlatform | undefined;
  url?: string | undefined;
  author?: string | undefined;
  status?: LearningStatus | undefined;
  progress?: number | undefined;
  completedItems?: number | undefined;
  totalItems?: number | undefined;
  rating?: number | undefined;
  tags?: string[] | undefined;
  notes?: string | undefined;
}): LearningResource {
  const now = new Date().toISOString();
  let progress = data.progress ?? 0;
  if (data.totalItems && data.totalItems > 0 && data.completedItems !== undefined) {
    progress = Math.min(100, Math.round((data.completedItems / data.totalItems) * 100));
  }

  return {
    id: generateId("crs"),
    topicId: data.topicId,
    title: data.title.trim() || "Untitled Course",
    platform: data.platform ?? "course",
    url: data.url?.trim() ?? "",
    author: data.author?.trim() ?? "",
    status: data.status ?? (progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started"),
    progress: Math.max(0, Math.min(100, progress)),
    completedItems: data.completedItems,
    totalItems: data.totalItems,
    rating: data.rating,
    tags: normalizeTagList(data.tags ?? []),
    notes: data.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Builds an enriched recursive tree structure for topics and their subtopics.
 */
export function buildTopicTree(
  topics: LearningTopic[],
  resources: LearningResource[],
  parentId: string | null = null
): TopicTreeNode[] {
  const directChildren = topics.filter((t) => t.parentId === parentId);

  return directChildren.map((topic) => {
    const children = buildTopicTree(topics, resources, topic.id);
    const directResources = resources.filter((r) => r.topicId === topic.id);
    const directResourceCount = directResources.length;

    // Calculate recursive resource count
    const descendantIds = getAllDescendantTopicIds(topics, topic.id);
    const allTopicIds = new Set([topic.id, ...descendantIds]);
    const allRelatedResources = resources.filter((r) => allTopicIds.has(r.topicId));
    const totalResourceCount = allRelatedResources.length;

    const progress = calculateTopicProgress(topic.id, topics, resources);

    return {
      ...topic,
      children,
      directResourceCount,
      totalResourceCount,
      progress,
    };
  });
}

/**
 * Traverses from root down to the specified topicId to generate breadcrumbs.
 */
export function getTopicPath(topics: LearningTopic[], topicId: string | null): TopicPathItem[] {
  if (!topicId) return [];

  const map = new Map<string, LearningTopic>();
  for (const t of topics) {
    map.set(t.id, t);
  }

  const path: TopicPathItem[] = [];
  let currentId: string | null = topicId;

  // Guard against cycles
  const visited = new Set<string>();

  while (currentId && map.has(currentId) && !visited.has(currentId)) {
    visited.add(currentId);
    const item: LearningTopic = map.get(currentId)!;
    path.unshift({ id: item.id, title: item.title });
    currentId = item.parentId;
  }

  return path;
}

/**
 * Collects all descendant (child, grandchild, etc.) topic IDs of a given topic.
 */
export function getAllDescendantTopicIds(topics: LearningTopic[], topicId: string): string[] {
  const result: string[] = [];
  const queue = [topicId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = topics.filter((t) => t.parentId === current);
    for (const child of children) {
      result.push(child.id);
      queue.push(child.id);
    }
  }

  return result;
}

/**
 * Calculates aggregate progress (0-100%) for a topic based on all its direct and subtopic resources.
 */
export function calculateTopicProgress(
  topicId: string,
  topics: LearningTopic[],
  resources: LearningResource[]
): number {
  const descendantIds = getAllDescendantTopicIds(topics, topicId);
  const relevantTopicIds = new Set([topicId, ...descendantIds]);
  const relevantResources = resources.filter((r) => relevantTopicIds.has(r.topicId));

  if (relevantResources.length === 0) return 0;

  const totalProgress = relevantResources.reduce((sum, r) => sum + (r.progress || 0), 0);
  return Math.round(totalProgress / relevantResources.length);
}

/**
 * Calculates overall progress across all resources.
 */
export function calculateOverallCoursesProgress(resources: LearningResource[]): number {
  if (resources.length === 0) return 0;
  const total = resources.reduce((sum, r) => sum + (r.progress || 0), 0);
  return Math.round(total / resources.length);
}

/**
 * Filters resources by topic, platform, status, search query, and tags.
 */
export function filterResources(
  resources: LearningResource[],
  options: {
    topicId?: string | null;
    includeSubtopics?: boolean;
    allTopics?: LearningTopic[];
    platform?: LearningPlatform | "all";
    status?: LearningStatus | "all";
    query?: string;
    tags?: string[];
    tagMatchMode?: "and" | "or";
  }
): LearningResource[] {
  let list = resources;

  // Filter by topic and optionally its subtopics
  if (options.topicId) {
    if (options.includeSubtopics && options.allTopics) {
      const descendants = getAllDescendantTopicIds(options.allTopics, options.topicId);
      const allowedIds = new Set([options.topicId, ...descendants]);
      list = list.filter((r) => allowedIds.has(r.topicId));
    } else {
      list = list.filter((r) => r.topicId === options.topicId);
    }
  }

  // Filter by platform
  if (options.platform && options.platform !== "all") {
    list = list.filter((r) => r.platform === options.platform);
  }

  // Filter by status
  if (options.status && options.status !== "all") {
    list = list.filter((r) => r.status === options.status);
  }

  // Filter by search query
  if (options.query && options.query.trim()) {
    const q = options.query.toLowerCase().trim();
    list = list.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q) ||
        (typeof r.notes === "string" && r.notes.toLowerCase().includes(q))
    );
  }

  // Filter by tags
  if (options.tags && options.tags.length > 0) {
    const normalizedFilterTags = options.tags.map((t) => t.toLowerCase());
    const isAnd = options.tagMatchMode === "and";

    list = list.filter((r) => {
      const resourceTags = new Set(r.tags.map((t) => t.toLowerCase()));
      if (isAnd) {
        return normalizedFilterTags.every((t) => resourceTags.has(t));
      }
      return normalizedFilterTags.some((t) => resourceTags.has(t));
    });
  }

  return list;
}

export function getPlatformLabel(platform: LearningPlatform): string {
  switch (platform) {
    case "udemy":
      return "Udemy";
    case "youtube":
      return "YouTube";
    case "article":
      return "Article / Paper";
    case "course":
      return "Course";
    case "book":
      return "Book";
    case "documentation":
      return "Documentation";
    case "other":
    default:
      return "Other";
  }
}

export function getStatusLabel(status: LearningStatus): string {
  switch (status) {
    case "not_started":
      return "Not Started";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "on_hold":
      return "On Hold";
    default:
      return status;
  }
}
