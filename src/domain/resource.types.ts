/**
 * Chronote Resource Browser Domain Types (DOMAIN_MODEL.md Section 2.7 & UX_SPEC.md Section 3.5).
 */

export type ResourceType = "outline" | "code" | "image" | "link" | "attachment" | "backlink";

export interface ResourceReference {
  readonly id: string;
  readonly resourceType: ResourceType;
  readonly parentDocumentId: string;
  readonly parentDocumentType: "dsm" | "general";
  readonly entryId?: string | undefined;
  readonly entryDate?: string | undefined;
  readonly blockId: string;
  title: string;
  snippet?: string | undefined;
  language?: string | undefined;
  targetUrl?: string | undefined;
  assetId?: string | undefined;
  targetNoteId?: string | undefined;
  fileSize?: number | undefined;
  fileName?: string | undefined;
}

export interface BacklinkReference {
  sourceDocumentId: string;
  sourceDocumentType: "dsm" | "general";
  sourceDocumentTitle: string;
  sourceEntryId?: string | undefined;
  sourceEntryDate?: string | undefined;
  targetNoteId: string;
}

export type ResourceScope = "activeDoc" | "workspace";
