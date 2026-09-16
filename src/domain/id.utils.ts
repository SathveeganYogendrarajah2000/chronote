/**
 * Unique identifier generator utilities (DOMAIN_MODEL.md Section 1.1).
 *
 * Entity ID Prefixes:
 * - wsp_ : Workspace
 * - ent_ : DSM Entry
 * - not_ : General Note
 * - blk_ : Content Block
 * - img_ : Image Asset
 * - att_ : File Attachment
 */

export type IdPrefix = "wsp" | "ent" | "not" | "blk" | "img" | "att";

export function generateId(prefix: IdPrefix): string {
  // Use timestamp + random alphanumeric suffix for chronological sortability
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  const randomPart2 = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${timestamp}${randomPart}${randomPart2}`;
}

export function isValidEntityId(id: string, prefix: IdPrefix): boolean {
  return typeof id === "string" && id.startsWith(`${prefix}_`) && id.length >= 10;
}
