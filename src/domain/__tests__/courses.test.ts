import { describe, it, expect } from "vitest";
import {
  createDefaultCoursesDocument,
  createLearningTopic,
  createLearningResource,
  buildTopicTree,
  getTopicPath,
  getAllDescendantTopicIds,
  calculateTopicProgress,
  calculateOverallCoursesProgress,
  filterResources,
} from "../courses.utils";
import {
  CoursesDocumentSchema,
  LearningTopicSchema,
  LearningResourceSchema,
} from "../validators";
import type { LearningTopic, LearningResource } from "../courses.types";

describe("Courses & Topics Domain Logic", () => {
  it("creates a valid default courses document conforming to schema", () => {
    const doc = createDefaultCoursesDocument();
    expect(doc.id).toBe("courses_master");
    expect(doc.schemaVersion).toBe(1);
    expect(doc.topics).toEqual([]);
    expect(doc.resources).toEqual([]);

    const parsed = CoursesDocumentSchema.safeParse(doc);
    expect(parsed.success).toBe(true);
  });

  it("creates valid topics and validates with Zod", () => {
    const topic = createLearningTopic(
      "Distributed Systems",
      null,
      "Core distributed systems theory and algorithms",
      ["systems", "architecture"]
    );

    expect(topic.id.startsWith("top_")).toBe(true);
    expect(topic.parentId).toBeNull();
    expect(topic.title).toBe("Distributed Systems");
    expect(topic.tags).toEqual(["architecture", "systems"]);

    const parsed = LearningTopicSchema.safeParse(topic);
    expect(parsed.success).toBe(true);
  });

  it("creates valid resources (courses, youtube, articles) with progress calculation", () => {
    const resource = createLearningResource({
      topicId: "top_01systems",
      title: "MIT 6.824: Distributed Systems",
      platform: "youtube",
      url: "https://www.youtube.com/playlist?list=PLrw6a1wE39_tb2fErI4-WkMbsvGQk9_UB",
      author: "Robert Morris",
      completedItems: 10,
      totalItems: 20,
      tags: ["mit", "lectures"],
      notes: "Lecture 1: Introduction to MapReduce",
    });

    expect(resource.id.startsWith("crs_")).toBe(true);
    expect(resource.topicId).toBe("top_01systems");
    expect(resource.platform).toBe("youtube");
    expect(resource.progress).toBe(50); // 10/20 = 50%
    expect(resource.status).toBe("in_progress");

    const parsed = LearningResourceSchema.safeParse(resource);
    expect(parsed.success).toBe(true);
  });

  it("builds multi-level recursive topic tree (Topic -> Subtopic -> Sub-subtopic)", () => {
    const rootTopic: LearningTopic = {
      id: "top_root",
      parentId: null,
      title: "Distributed Systems",
      description: "",
      tags: [],
      content: { type: "doc", content: [{ type: "paragraph" }] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const subtopic: LearningTopic = {
      id: "top_consensus",
      parentId: "top_root",
      title: "Consensus Algorithms",
      description: "",
      tags: [],
      content: { type: "doc", content: [{ type: "paragraph" }] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const subSubtopic: LearningTopic = {
      id: "top_raft",
      parentId: "top_consensus",
      title: "Raft",
      description: "",
      tags: [],
      content: { type: "doc", content: [{ type: "paragraph" }] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const resource1 = createLearningResource({
      topicId: "top_raft",
      title: "Raft Paper",
      platform: "article",
      progress: 100,
      status: "completed",
    });

    const resource2 = createLearningResource({
      topicId: "top_root",
      title: "MIT Distributed Systems",
      platform: "youtube",
      progress: 50,
      status: "in_progress",
    });

    const topics = [rootTopic, subtopic, subSubtopic];
    const resources = [resource1, resource2];

    const tree = buildTopicTree(topics, resources, null);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe("top_root");
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.id).toBe("top_consensus");
    expect(tree[0]?.children[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.children[0]?.id).toBe("top_raft");
    expect(tree[0]?.children[0]?.children[0]?.directResourceCount).toBe(1);
  });

  it("resolves breadcrumb path from child up to root", () => {
    const defaultDoc = { type: "doc", content: [{ type: "paragraph" }] };
    const topics: LearningTopic[] = [
      { id: "top_1", parentId: null, title: "Backend", description: "", tags: [], content: defaultDoc, createdAt: "", updatedAt: "" },
      { id: "top_2", parentId: "top_1", title: "Databases", description: "", tags: [], content: defaultDoc, createdAt: "", updatedAt: "" },
      { id: "top_3", parentId: "top_2", title: "PostgreSQL", description: "", tags: [], content: defaultDoc, createdAt: "", updatedAt: "" },
    ];

    const path = getTopicPath(topics, "top_3");
    expect(path).toHaveLength(3);
    expect(path[0]?.title).toBe("Backend");
    expect(path[1]?.title).toBe("Databases");
    expect(path[2]?.title).toBe("PostgreSQL");
  });

  it("calculates all descendant topic IDs recursively", () => {
    const defaultDoc = { type: "doc", content: [{ type: "paragraph" }] };
    const topics: LearningTopic[] = [
      { id: "top_1", parentId: null, title: "A", description: "", tags: [], content: defaultDoc, createdAt: "", updatedAt: "" },
      { id: "top_2", parentId: "top_1", title: "B", description: "", tags: [], content: defaultDoc, createdAt: "", updatedAt: "" },
      { id: "top_3", parentId: "top_2", title: "C", description: "", tags: [], content: defaultDoc, createdAt: "", updatedAt: "" },
      { id: "top_4", parentId: "top_1", title: "D", description: "", tags: [], content: defaultDoc, createdAt: "", updatedAt: "" },
    ];

    const descendants = getAllDescendantTopicIds(topics, "top_1");
    expect(descendants).toEqual(["top_2", "top_4", "top_3"]);
  });

  it("calculates progress aggregates across parent topic and subtopics", () => {
    const defaultDoc = { type: "doc", content: [{ type: "paragraph" }] };
    const topics: LearningTopic[] = [
      { id: "top_parent", parentId: null, title: "Frontend", description: "", tags: [], content: defaultDoc, createdAt: "", updatedAt: "" },
      { id: "top_child", parentId: "top_parent", title: "React", description: "", tags: [], content: defaultDoc, createdAt: "", updatedAt: "" },
    ];

    const resources: LearningResource[] = [
      createLearningResource({ topicId: "top_parent", title: "Web Basics", progress: 100 }),
      createLearningResource({ topicId: "top_child", title: "Advanced React", progress: 50 }),
    ];

    const parentProgress = calculateTopicProgress("top_parent", topics, resources);
    expect(parentProgress).toBe(75); // (100 + 50) / 2 = 75

    const childProgress = calculateTopicProgress("top_child", topics, resources);
    expect(childProgress).toBe(50);

    const overall = calculateOverallCoursesProgress(resources);
    expect(overall).toBe(75);
  });

  it("filters resources by platform, status, query, and tag matching modes", () => {
    const r1 = createLearningResource({
      topicId: "top_1",
      title: "React Course on Udemy",
      platform: "udemy",
      status: "in_progress",
      tags: ["frontend", "javascript"],
    });

    const r2 = createLearningResource({
      topicId: "top_1",
      title: "YouTube Video on Rust",
      platform: "youtube",
      status: "completed",
      tags: ["rust", "systems"],
    });

    const r3 = createLearningResource({
      topicId: "top_1",
      title: "Postgres Deep Dive Article",
      platform: "article",
      status: "not_started",
      tags: ["database", "sql"],
    });

    const list = [r1, r2, r3];

    // Filter by platform
    const udemyOnly = filterResources(list, { platform: "udemy" });
    expect(udemyOnly).toHaveLength(1);
    expect(udemyOnly[0]?.title).toBe("React Course on Udemy");

    // Filter by status
    const completedOnly = filterResources(list, { status: "completed" });
    expect(completedOnly).toHaveLength(1);
    expect(completedOnly[0]?.platform).toBe("youtube");

    // Filter by search query
    const searchRust = filterResources(list, { query: "Rust" });
    expect(searchRust).toHaveLength(1);

    // Filter by tags with AND match mode
    const multiTagAnd = filterResources(list, { tags: ["frontend", "javascript"], tagMatchMode: "and" });
    expect(multiTagAnd).toHaveLength(1);

    // Filter by tags with OR match mode
    const multiTagOr = filterResources(list, { tags: ["frontend", "rust"], tagMatchMode: "or" });
    expect(multiTagOr).toHaveLength(2);
  });
});
