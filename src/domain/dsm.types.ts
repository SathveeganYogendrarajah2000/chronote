import type { ProseMirrorNode } from "./document.types";

/**
 * Single logical Daily Stand-up Journal master document.
 * There is exactly one master DSM document per workspace (ADR-006).
 */
export interface DsmDocument {
  readonly id: "dsm_master";
  readonly schemaVersion: number; // Currently 1
  title: string;
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
  entries: DsmEntry[];            // Chronologically ordered date entries
}

/**
 * Independently addressable calendar date entry domain object.
 * Dates are structured metadata, NEVER parsed from markdown headings (ADR-006).
 */
export interface DsmEntry {
  readonly id: string;            // Prefixed e.g. "ent_01JC87W9E3..."
  date: string;                   // Canonical ISO date: "YYYY-MM-DD"
  tags: string[];                 // Normalized lowercase tags e.g. ["springboot", "backend"]
  collapsed: boolean;             // UI collapse state
  content: ProseMirrorNode;       // Canonical structured rich text document
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
}
