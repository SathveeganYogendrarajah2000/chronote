import type { ProseMirrorNode } from "./document.types";

export type LearningPlatform =
  | "udemy"
  | "youtube"
  | "article"
  | "course"
  | "book"
  | "documentation"
  | "other";

export type LearningStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "on_hold";

/**
 * Individual course, tutorial, video, or article followed under a topic or subtopic.
 */
export interface LearningResource {
  readonly id: string;            // Prefixed e.g. "crs_01JC..."
  topicId: string;                // References parent LearningTopic.id
  title: string;                  // e.g. "Complete React & Next.js Masterclass"
  platform: LearningPlatform;     // "udemy" | "youtube" | "article" | ...
  url: string;                    // Web link or reference URL
  author: string;                 // Instructor, creator, or author
  status: LearningStatus;         // "not_started" | "in_progress" | "completed" | "on_hold"
  progress: number;               // 0 to 100 percentage
  completedItems?: number | undefined;        // e.g. 14 lectures done
  totalItems?: number | undefined;            // e.g. 28 lectures total
  rating?: number | undefined;                // Optional 1-5 star score
  tags: string[];                 // Normalized lowercase tags
  notes: string | ProseMirrorNode;// Full study notes, timestamps, or takeaways
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
}

/**
 * Hierarchical topic or subtopic node supporting arbitrary N-level depth.
 * Root topics have parentId: null; subtopics point to their parent topic's id.
 */
export interface LearningTopic {
  readonly id: string;            // Prefixed e.g. "top_01JC..."
  parentId: string | null;        // null if root topic; parent topic id if subtopic
  title: string;                  // e.g. "Distributed Systems" or "Raft Consensus"
  description: string;            // Overview / objectives
  tags: string[];                 // Normalized lowercase tags
  notes?: string | ProseMirrorNode | undefined; // Optional synthesis notes for the topic
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
}

/**
 * Master courses & learning document stored in workspace at notes/courses.json.
 * Single continuous logical journal following ADR-003 and ADR-006.
 */
export interface CoursesDocument {
  readonly id: "courses_master";
  readonly schemaVersion: number; // Currently 1
  title: string;                  // "Courses & Topics"
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
  topics: LearningTopic[];
  resources: LearningResource[];
}

/**
 * Enriched tree node for recursive hierarchy rendering in UI sidebar and canvases.
 */
export interface TopicTreeNode extends LearningTopic {
  children: TopicTreeNode[];
  directResourceCount: number;
  totalResourceCount: number;
  progress: number;
}

export interface TopicPathItem {
  id: string;
  title: string;
}
