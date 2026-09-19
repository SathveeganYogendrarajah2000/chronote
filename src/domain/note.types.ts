import type { ProseMirrorNode } from "./document.types";

/**
 * Standalone General engineering note.
 * Titles are mutable, IDs are permanent and immutable.
 */
export interface GeneralNote {
  readonly id: string;            // Prefixed e.g. "not_01JC87XK89..."
  readonly schemaVersion: number; // Currently 1
  title: string;                  // Editable without breaking incoming links
  tags: string[];                 // Normalized lowercase tags
  content: ProseMirrorNode;       // Canonical structured rich text document
  pinned: boolean;                // Pin to top of notes list
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
}

/**
 * Lightweight note descriptor for sidebar and lists.
 * Prevents loading entire document node trees for unopened notes (PERFORMANCE.md).
 */
export interface NoteMetadata {
  readonly id: string;
  title: string;
  tags: string[];
  pinned: boolean;
  updatedAt: string;
}
