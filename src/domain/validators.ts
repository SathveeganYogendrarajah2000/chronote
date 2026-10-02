import { z } from "zod";
import { normalizeTag, isValidTag } from "./tagNormalizer";

export const TagSchema = z
  .string()
  .trim()
  .transform((val) => normalizeTag(val))
  .refine((val) => isValidTag(val), {
    message: "Tags must contain only lowercase letters, numbers, hyphens, and underscores",
  });

export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must follow YYYY-MM-DD format")
  .refine(
    (val) => {
      const [year, month, day] = val.split("-").map(Number);
      if (!year || !month || !day) return false;
      const date = new Date(Date.UTC(year, month - 1, day));
      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      );
    },
    { message: "Date must be a valid Gregorian calendar date" }
  );

export const ProseMirrorNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    type: z.string(),
    attrs: z.record(z.unknown()).optional(),
    content: z.array(ProseMirrorNodeSchema).optional(),
    marks: z
      .array(
        z.object({
          type: z.string(),
          attrs: z.record(z.unknown()).optional(),
        })
      )
      .optional(),
    text: z.string().optional(),
  })
);

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

export const WorkspaceSettingsSchema = z.object({
  editorFontSize: z.number().min(10).max(32).default(15),
  editorLineHeight: z.number().min(1.0).max(2.5).default(1.6),
  theme: z.enum(["dark", "light", "system"]).default("dark"),
  dsmSortOrder: z.enum(["desc", "asc"]).default("desc"),
  autosaveIntervalMs: z.number().min(200).max(5000).default(800),
});

export const WorkspaceSchema = z.object({
  id: z.string().startsWith("wsp_"),
  schemaVersion: z.literal(1),
  name: z.string().min(1),
  path: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  settings: WorkspaceSettingsSchema,
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

export const LearningTopicSchema = z.object({
  id: z.string().startsWith("top_"),
  parentId: z.string().startsWith("top_").nullable(),
  title: z.string().min(1),
  description: z.string().default(""),
  tags: z.array(TagSchema).default([]),
  notes: z.union([z.string(), z.record(z.unknown())]).optional(),
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

