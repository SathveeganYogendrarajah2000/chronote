/**
 * Canonical structured rich-text document representation (ProseMirror JSON tree).
 * Internal storage is NEVER raw Markdown (ADR-002).
 */

export interface ProseMirrorMark {
  type: "bold" | "italic" | "underline" | "strike" | "code" | "link" | "internalLink";
  attrs?: Record<string, unknown>;
}

export interface ProseMirrorNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseMirrorNode[];
  marks?: ProseMirrorMark[];
  text?: string;
}

export interface CodeBlockAttrs {
  readonly id: string; // Stable ULID/UUID e.g. "blk_01JC..."
  language: string;    // e.g. "java", "sql", "mongodb", "typescript"
  caption?: string;
}

export type ResourceType = "code" | "image" | "link" | "attachment" | "internalLink";

export interface ResourceReference {
  readonly id: string;
  readonly resourceType: ResourceType;
  readonly parentDocumentId: string;
  readonly parentDocumentType: "dsm" | "general";
  readonly entryId?: string;
  readonly blockId: string;
  title: string;
  snippet?: string;
  language?: string;
  targetUrl?: string;
  assetId?: string;
  targetNoteId?: string;
}
