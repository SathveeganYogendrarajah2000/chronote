import { describe, it, expect, beforeEach } from "vitest";
import { useCoursesStore } from "../stores/useCoursesStore";
import { mockIpcBridge } from "@infrastructure/tauri/mockIpcBridge";

describe("useCoursesStore", () => {
  beforeEach(async () => {
    mockIpcBridge.reset();
    await useCoursesStore.getState().loadCourses();
  });

  it("initializes and loads empty default courses document", () => {
    const { coursesDoc, selectedTopicId } = useCoursesStore.getState();
    expect(coursesDoc).not.toBeNull();
    expect(coursesDoc?.id).toBe("courses_master");
    expect(coursesDoc?.topics).toEqual([]);
    expect(coursesDoc?.resources).toEqual([]);
    expect(selectedTopicId).toBeNull();
  });

  it("creates a root topic and auto-selects it", () => {
    const topic = useCoursesStore
      .getState()
      .createTopic("Distributed Systems", null, "Distributed consensus", ["distributed"]);

    const { coursesDoc, selectedTopicId } = useCoursesStore.getState();
    expect(coursesDoc?.topics).toHaveLength(1);
    expect(coursesDoc?.topics[0]?.id).toBe(topic.id);
    expect(coursesDoc?.topics[0]?.title).toBe("Distributed Systems");
    expect(selectedTopicId).toBe(topic.id);
  });

  it("creates nested subtopics under a parent topic", () => {
    const root = useCoursesStore.getState().createTopic("Distributed Systems");
    const subtopic = useCoursesStore
      .getState()
      .createTopic("Consensus Algorithms", root.id);
    const subSubtopic = useCoursesStore
      .getState()
      .createTopic("Raft Protocol", subtopic.id);

    const { coursesDoc } = useCoursesStore.getState();
    expect(coursesDoc?.topics).toHaveLength(3);

    const raft = coursesDoc?.topics.find((t) => t.id === subSubtopic.id);
    expect(raft?.parentId).toBe(subtopic.id);

    const consensus = coursesDoc?.topics.find((t) => t.id === subtopic.id);
    expect(consensus?.parentId).toBe(root.id);
  });

  it("creates learning resources attached to topics", () => {
    const topic = useCoursesStore.getState().createTopic("System Design");
    const resource = useCoursesStore.getState().createResource({
      topicId: topic.id,
      title: "Pragmatic System Design on Udemy",
      platform: "udemy",
      url: "https://www.udemy.com/course/system-design",
      author: "Hussein Nasser",
      totalItems: 30,
      completedItems: 15,
      notes: "Key takeaways from module 1",
    });

    const { coursesDoc } = useCoursesStore.getState();
    expect(coursesDoc?.resources).toHaveLength(1);
    expect(coursesDoc?.resources[0]?.id).toBe(resource.id);
    expect(coursesDoc?.resources[0]?.topicId).toBe(topic.id);
    expect(coursesDoc?.resources[0]?.progress).toBe(50);
    expect(coursesDoc?.resources[0]?.status).toBe("in_progress");
  });

  it("increments progress and updates completion status", () => {
    const topic = useCoursesStore.getState().createTopic("Frontend");
    const resource = useCoursesStore.getState().createResource({
      topicId: topic.id,
      title: "React Course",
      platform: "udemy",
      totalItems: 10,
      completedItems: 9,
    });

    expect(resource.status).toBe("in_progress");

    // Increment progress by 1 lecture
    useCoursesStore.getState().incrementResourceProgress(resource.id, 1);

    const updated = useCoursesStore.getState().coursesDoc?.resources[0];
    expect(updated?.completedItems).toBe(10);
    expect(updated?.progress).toBe(100);
    expect(updated?.status).toBe("completed");
  });

  it("cascades deletion of a parent topic removing all its subtopics and resources", async () => {
    const root = useCoursesStore.getState().createTopic("Topic A");
    const subtopic = useCoursesStore.getState().createTopic("Subtopic A1", root.id);
    const subSubtopic = useCoursesStore.getState().createTopic("Subtopic A1.1", subtopic.id);

    useCoursesStore.getState().createResource({
      topicId: root.id,
      title: "Course on Root",
    });
    useCoursesStore.getState().createResource({
      topicId: subSubtopic.id,
      title: "Course on Sub-Subtopic",
    });

    expect(useCoursesStore.getState().coursesDoc?.topics).toHaveLength(3);
    expect(useCoursesStore.getState().coursesDoc?.resources).toHaveLength(2);

    // Delete the root topic
    await useCoursesStore.getState().deleteTopic(root.id);

    const { coursesDoc } = useCoursesStore.getState();
    expect(coursesDoc?.topics).toHaveLength(0);
    expect(coursesDoc?.resources).toHaveLength(0);
  });

  it("updates resource study notes and topic synthesis notes", () => {
    const topic = useCoursesStore.getState().createTopic("Database Internals");
    const resource = useCoursesStore.getState().createResource({
      topicId: topic.id,
      title: "CMU 15-445",
      platform: "youtube",
    });

    useCoursesStore.getState().updateResourceNotes(resource.id, "B-Trees vs LSM-Trees comparison notes");
    useCoursesStore.getState().updateTopicNotes(topic.id, "Comprehensive database architecture summary");

    const { coursesDoc } = useCoursesStore.getState();
    const updatedRes = coursesDoc?.resources.find((r) => r.id === resource.id);
    const updatedTop = coursesDoc?.topics.find((t) => t.id === topic.id);

    expect(updatedRes?.notes).toBe("B-Trees vs LSM-Trees comparison notes");
    expect(updatedTop?.notes).toBe("Comprehensive database architecture summary");
  });

  it("handles filtering by search, platform, status, and tags", () => {
    useCoursesStore.getState().setSearchQuery("microservices");
    expect(useCoursesStore.getState().searchQuery).toBe("microservices");

    useCoursesStore.getState().setSelectedPlatform("youtube");
    expect(useCoursesStore.getState().selectedPlatform).toBe("youtube");

    useCoursesStore.getState().setSelectedStatus("completed");
    expect(useCoursesStore.getState().selectedStatus).toBe("completed");

    useCoursesStore.getState().toggleTagFilter("architecture");
    expect(useCoursesStore.getState().selectedTags).toContain("architecture");
    useCoursesStore.getState().clearTagFilters();
    expect(useCoursesStore.getState().selectedTags).toEqual([]);
  });

  it("supports user learning path: AWS root topic -> Udemy course subtopic -> rich notes content", async () => {
    // 1. Create root topic "AWS"
    const awsRoot = useCoursesStore.getState().createTopic("AWS", null, "Amazon Web Services study roadmap");
    expect(awsRoot.id).toBeDefined();

    // 2. Create subtopic "AWS Cloud Solutions Architect Associate" from Udemy
    const udemyCourseSubtopic = useCoursesStore.getState().createTopic({
      title: "AWS Cloud Solutions Architect Associate",
      parentId: awsRoot.id,
      platform: "udemy",
      url: "https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03/",
      author: "Stephane Maarek",
      status: "in_progress",
      progress: 35,
      tags: ["aws", "cloud", "saa-c03"],
    });

    expect(udemyCourseSubtopic.parentId).toBe(awsRoot.id);
    expect(udemyCourseSubtopic.platform).toBe("udemy");
    expect(udemyCourseSubtopic.author).toBe("Stephane Maarek");
    expect(udemyCourseSubtopic.progress).toBe(35);

    // 3. Update notes content for the subtopic with rich ProseMirror document
    const studyNotesDoc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1, blockId: "blk_saa_intro" },
          content: [{ type: "text", text: "IAM & S3 Storage Architecture" }],
        },
        {
          type: "paragraph",
          attrs: { blockId: "blk_saa_p1" },
          content: [{ type: "text", text: "IAM policies follow the principle of least privilege." }],
        },
      ],
    };

    useCoursesStore.getState().updateTopicContent(udemyCourseSubtopic.id, studyNotesDoc);

    // Verify in store
    const currentSubtopic = useCoursesStore
      .getState()
      .coursesDoc?.topics.find((t) => t.id === udemyCourseSubtopic.id);
    expect(currentSubtopic?.content).toEqual(studyNotesDoc);

    // Verify progress update
    useCoursesStore.getState().updateTopicProgress(udemyCourseSubtopic.id, 100);
    const completedSubtopic = useCoursesStore
      .getState()
      .coursesDoc?.topics.find((t) => t.id === udemyCourseSubtopic.id);
    expect(completedSubtopic?.progress).toBe(100);
    expect(completedSubtopic?.status).toBe("completed");
  });
});
