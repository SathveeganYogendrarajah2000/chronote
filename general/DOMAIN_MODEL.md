# Chronote Domain Model Specification

## 1. Domain Overview & Identity Strategy

Chronote's domain model defines the core entities, value objects, and relationships governing notes, stand-up entries, structured blocks, tags, assets, and tabs.

### 1.1 Identifier Conventions
To ensure global uniqueness, chronological sortability, and URL/filesystem safety without collisions:
- **Entities (Notes, DSM Entries, Blocks, Assets)** utilize **ULID** (Universally Unique Lexicographically Sortable Identifier) or canonical UUIDv4 strings.
- **Entity ID Prefixes:**
  - Workspace: `wsp_` (e.g. `wsp_01JC87V1M4P9X7...`)
  - DSM Master Document: `dsm_master` (singleton per workspace)
  - DSM Entry: `ent_` (e.g. `ent_01JC87W9E3...`)
  - General Note: `not_` (e.g. `not_01JC87XK89...`)
  - Content Block: `blk_` (e.g. `blk_01JC87Y45Q...`)
  - Asset (Image): `img_` (e.g. `img_01JC87Z1AA...`)
  - Asset (File): `att_` (e.g. `att_01JC8803BB...`)
  - Learning Topic: `top_` (e.g. `top_01JC8814CC...`)
  - Course / Learning Resource: `crs_` (e.g. `crs_01JC8825DD...`)
- **Immutability of IDs:** An entity's ID is immutable. Internal links and resource index entries point exclusively to IDs, never to mutable titles or dates.

---

## 2. Core Domain Entities & Interfaces

### 2.1 Workspace
Represents the local-first root container.
```typescript
interface Workspace {
  readonly id: string;            // e.g. "wsp_01JC87..."
  readonly schemaVersion: number; // Currently 1
  name: string;                   // User-defined workspace name
  path: string;                   // Absolute local filesystem path
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
  settings: WorkspaceSettings;
}

interface WorkspaceSettings {
  editorFontSize: number;         // Default: 15
  editorLineHeight: number;       // Default: 1.6
  theme: "dark" | "light" | "system"; // Default: "system"
  dsmSortOrder: "desc" | "asc";   // Default: "desc" (newest date on top)
  autosaveIntervalMs: number;     // Default: 800
}
```

### 2.2 Daily Stand-up (DSM) Document & Date Entries
The DSM system consists of one logical journal containing an ordered array of independent date entry domain objects.

```typescript
interface DsmDocument {
  readonly id: "dsm_master";
  readonly schemaVersion: number; // Currently 1
  title: string;                  // "Daily Stand-up Journal"
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
  entries: DsmEntry[];            // Ordered list of date entries
}

interface DsmEntry {
  readonly id: string;            // e.g. "ent_01JC87W9E3..."
  date: string;                   // Strict ISO Date: "YYYY-MM-DD"
  tags: string[];                 // Normalized tag strings (e.g. ["springboot", "backend"])
  collapsed: boolean;             // Persisted UI collapse state
  content: ProseMirrorNode;       // Canonical structured rich text document
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
}
```

### 2.3 General Note
Represents a standalone knowledge or investigation note.
```typescript
interface GeneralNote {
  readonly id: string;            // e.g. "not_01JC87XK89..."
  readonly schemaVersion: number; // Currently 1
  title: string;                  // Note title (can be edited without breaking links)
  tags: string[];                 // Normalized tags
  content: ProseMirrorNode;       // Canonical structured rich text document
  pinned: boolean;                // Pin to top of notes list
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
}
```

### 2.4 Courses & Topics Document (Learning Tracker)
Represents structured engineering study and course tracking organized hierarchically.
```typescript
interface CoursesDocument {
  readonly id: "courses_master";
  readonly schemaVersion: number; // Currently 1
  title: string;                  // "Courses & Topics"
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
  topics: LearningTopic[];
  resources: LearningResource[];
}

interface LearningTopic {
  readonly id: string;            // e.g. "top_01JC..."
  parentId: string | null;        // null for root topics; parent topic id for subtopics
  title: string;                  // Topic name
  description: string;            // Learning goal or summary
  tags: string[];                 // Normalized tags
  notes?: string | ProseMirrorNode; // Synthesis notes for this topic
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
}

interface LearningResource {
  readonly id: string;            // e.g. "crs_01JC..."
  topicId: string;                // References parent LearningTopic.id
  title: string;                  // Resource title
  platform: "udemy" | "youtube" | "article" | "course" | "book" | "documentation" | "other";
  url: string;                    // Web link
  author: string;                 // Instructor, creator, or author
  status: "not_started" | "in_progress" | "completed" | "on_hold";
  progress: number;               // 0 to 100 percentage
  completedItems?: number;        // Completed lectures/items
  totalItems?: number;            // Total lectures/items
  rating?: number;                // 1-5 star rating
  tags: string[];                 // Normalized tags
  notes: string | ProseMirrorNode;// Full study takeaways and notes
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
}
```

### 2.5 Canonical Structured Block Model (ProseMirror JSON)
All note contents are represented as a structured node tree:
```typescript
interface ProseMirrorNode {
  type: string;                   // "doc", "paragraph", "heading", "codeBlock", etc.
  attrs?: Record<string, unknown>;// e.g. { id: "blk_01...", level: 2, language: "sql" }
  content?: ProseMirrorNode[];    // Recursive child nodes
  marks?: ProseMirrorMark[];      // Inline formatting marks
  text?: string;                  // Leaf text content
}

interface ProseMirrorMark {
  type: "bold" | "italic" | "underline" | "strike" | "code" | "link" | "internalLink";
  attrs?: Record<string, unknown>;// e.g. { href: "https://...", noteId: "not_01..." }
}
```

### 2.5 Structured Code Block Entity
Code blocks are first-class domain citizens with stable identity:
```typescript
interface CodeBlockAttributes {
  readonly id: string;            // e.g. "blk_01JC..."
  language: string;               // e.g. "java", "sql", "mongodb", "typescript"
  caption?: string;               // Optional description (e.g. "User aggregation query")
}
```

### 2.6 Binary Asset Entity
Represents external media attached to notes.
```typescript
interface Asset {
  readonly id: string;            // e.g. "img_01JC..." or "att_01JC..."
  readonly originalFileName: string;
  readonly storageFileName: string;// e.g. "img_01JC...png"
  readonly mimeType: string;      // "image/png", "application/pdf", etc.
  readonly sizeBytes: number;
  readonly contentHash: string;   // SHA-256 for deduplication
  readonly relativePath: string;  // "assets/images/img_01JC...png"
  createdAt: string;              // ISO 8601 UTC
}
```

### 2.7 Resource Reference (Resource Browser Entity)
Represents an indexed reference extracted from note content:
```typescript
type ResourceType = "code" | "image" | "link" | "attachment" | "internalLink";

interface ResourceReference {
  readonly id: string;            // Unique resource reference ID
  readonly resourceType: ResourceType;
  readonly parentDocumentId: string; // Document ID ("dsm_master" or noteId)
  readonly parentDocumentType: "dsm" | "general";
  readonly entryId?: string;      // DsmEntry ID if inside a DSM entry
  readonly blockId: string;       // Target block ID for deep navigation
  title: string;                  // Display title or code snippet label
  snippet?: string;               // Preview text or query snippet
  language?: string;              // If resourceType === "code"
  targetUrl?: string;             // If resourceType === "link"
  assetId?: string;               // If resourceType === "image" | "attachment"
  targetNoteId?: string;          // If resourceType === "internalLink"
}
```

### 2.8 Tab State
Represents open tabs in the workspace UI:
```typescript
interface TabItem {
  readonly id: string;            // Tab unique ID
  readonly documentId: string;    // "dsm_master" or note ID
  readonly documentType: "dsm" | "general";
  title: string;                  // Cached display title
  isPinned: boolean;              // Pinned tabs cannot be closed accidentally
  scrollPosition?: number;        // Restored on tab switch
}

interface TabSessionState {
  tabs: TabItem[];
  activeTabId: string;
  closedTabHistory: TabItem[];    // Reopen closed tab stack (max 20)
}
```

### 2.7 Table of Contents (Outline) Heading Model
Represents an ordered heading node extracted from a ProseMirror document tree.
```typescript
interface TocHeadingItem {
  readonly id: string;        // Stable Block ID e.g. "blk_01JC87Y45Q..."
  readonly level: number;     // Heading depth (1 for h1, 2 for h2, 3 for h3)
  readonly text: string;      // Plaintext heading title
  readonly index: number;     // 0-indexed document occurrence position
}
```

### 2.8 Resource References & Filter Mode Types
The Resource Inspector aggregates references across the workspace or active document:
```typescript
type ResourceType = "outline" | "code" | "image" | "link" | "attachment" | "backlink";

type TagMatchMode = "and" | "or";
```

### 2.9 Learning Topic & Courses Document Entities
Represents the structured learning roadmap, courses, and topic-specific study notes:
```typescript
type LearningPlatform = "udemy" | "youtube" | "article" | "course" | "book" | "documentation" | "other";
type LearningStatus = "not_started" | "in_progress" | "completed" | "on_hold";

interface LearningTopic {
  readonly id: string;            // Prefixed e.g. "top_01JC..."
  parentId: string | null;        // null if root topic; parent topic id if subtopic
  title: string;                  // e.g. "Distributed Systems" or "AWS Solutions Architect"
  description: string;            // Overview / objectives
  tags: string[];                 // Normalized lowercase tags
  platform?: LearningPlatform;    // Optional platform association
  url?: string;                   // External course or reference URL
  author?: string;                // Instructor or creator
  status?: LearningStatus;        // "not_started" | "in_progress" | "completed" | "on_hold"
  progress?: number;              // 0 to 100 percentage
  completedItems?: number;        // e.g. 20 lectures done
  totalItems?: number;            // e.g. 50 lectures total
  rating?: number;                // Optional 1-5 rating
  content: ProseMirrorNode;       // Full rich-text document tree running in ChronoteEditor
  notes?: string | ProseMirrorNode;// Legacy notes compatibility
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
}

interface LearningResource {
  readonly id: string;            // Prefixed e.g. "crs_01JC..."
  topicId: string;                // References parent LearningTopic.id
  title: string;                  // e.g. "Complete React & Next.js Masterclass"
  platform: LearningPlatform;
  url: string;
  author: string;
  status: LearningStatus;
  progress: number;
  completedItems?: number;
  totalItems?: number;
  rating?: number;
  tags: string[];
  notes: string | ProseMirrorNode;
  createdAt: string;
  updatedAt: string;
}

interface CoursesDocument {
  readonly id: "courses_master";
  readonly schemaVersion: number; // Currently 1
  title: string;                  // "Courses & Topics"
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
  topics: LearningTopic[];
  resources: LearningResource[];
}
```

---

## 3. Domain Invariants and Validation Rules

### 3.1 Tag Domain Rules
- **Syntax:** Normalized to lowercase alphanumeric string with hyphen or underscore: `^[a-z0-9_\-]+$`
- **Trimming:** Leading `#` characters and surrounding whitespace are stripped automatically upon assignment.
- **Duplicates:** An entry or note cannot contain duplicate tags. Tag arrays are strictly treated as sets.
- **Empty Tags:** Empty strings or whitespace-only tags are rejected.
- **Preservation:** The original casing may be recorded for display if required, but comparison, indexing, and querying operate exclusively on the normalized value.

### 3.2 DSM Date Rules
- **Strict Format:** Must strictly conform to `YYYY-MM-DD` (e.g. `2026-09-15`).
- **Uniqueness:** There can only be **at most one entry per calendar date** within a DSM document. If a user writes stand-up notes for a date that already exists, the content is appended or merged into the existing entry for that date.
- **Validity:** Must represent a valid calendar date according to the Gregorian calendar (e.g. `2026-02-30` is rejected).

### 3.3 Internal Link Rules
- An internal link MUST contain:
  1. `targetNoteId`: Immutable ID of the target document.
  2. `displayText`: User-visible anchor text (defaults to the target note's current title).
- If the target note is deleted:
  - The link is visually styled as a "broken reference" (e.g. dashed red underline).
  - Clicking a broken reference displays a prompt offering to restore or create a new note with that title.
  - The document does not crash.

---

## 4. Zod Validation Schemas (Domain Boundary)

```typescript
import { z } from "zod";

export const TagSchema = z
  .string()
  .trim()
  .transform((val) => val.replace(/^#/, "").toLowerCase())
  .refine((val) => /^[a-z0-9_\-]+$/.test(val), {
    message: "Tags must contain only lowercase letters, numbers, hyphens, and underscores",
  });

export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must follow YYYY-MM-DD format");

export const DsmEntrySchema = z.object({
  id: z.string().startsWith("ent_"),
  date: IsoDateSchema,
  tags: z.array(TagSchema),
  collapsed: z.boolean().default(false),
  content: z.record(z.unknown()), // ProseMirror JSON tree
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DsmDocumentSchema = z.object({
  id: z.literal("dsm_master"),
  schemaVersion: z.literal(1),
  title: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  entries: z.array(DsmEntrySchema),
});

export const GeneralNoteSchema = z.object({
  id: z.string().startsWith("not_"),
  schemaVersion: z.literal(1),
  title: z.string().min(1).default("Untitled Note"),
  tags: z.array(TagSchema),
  content: z.record(z.unknown()),
  pinned: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const LearningPlatformSchema = z.enum([
  "udemy",
  "youtube",
  "article",
  "course",
  "book",
  "documentation",
  "other",
]);

export const LearningStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "on_hold",
]);

export const LearningTopicSchema = z.object({
  id: z.string().startsWith("top_"),
  parentId: z.string().startsWith("top_").nullable(),
  title: z.string().min(1),
  description: z.string().default(""),
  tags: z.array(TagSchema).default([]),
  platform: LearningPlatformSchema.optional(),
  url: z.string().optional(),
  author: z.string().optional(),
  status: LearningStatusSchema.optional(),
  progress: z.number().min(0).max(100).optional(),
  completedItems: z.number().nonnegative().optional(),
  totalItems: z.number().nonnegative().optional(),
  rating: z.number().min(1).max(5).optional(),
  content: z.record(z.unknown()).default({ type: "doc", content: [{ type: "paragraph" }] }),
  notes: z.union([z.string(), z.record(z.unknown())]).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const LearningResourceSchema = z.object({
  id: z.string().startsWith("crs_"),
  topicId: z.string().startsWith("top_"),
  title: z.string().min(1),
  platform: LearningPlatformSchema,
  url: z.string().default(""),
  author: z.string().default(""),
  status: LearningStatusSchema,
  progress: z.number().min(0).max(100).default(0),
  completedItems: z.number().nonnegative().optional(),
  totalItems: z.number().nonnegative().optional(),
  rating: z.number().min(1).max(5).optional(),
  tags: z.array(TagSchema).default([]),
  notes: z.union([z.string(), z.record(z.unknown())]).default(""),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CoursesDocumentSchema = z.object({
  id: z.literal("courses_master"),
  schemaVersion: z.literal(1),
  title: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  topics: z.array(LearningTopicSchema),
  resources: z.array(LearningResourceSchema),
});
```
