import type { GeneralNote, NoteMetadata } from "./note.types";
import { generateId } from "./id.utils";
import { normalizeTagList } from "./tagNormalizer";
import { textToProseMirrorDoc, proseMirrorDocToText } from "./dsm.utils";

export { textToProseMirrorDoc, proseMirrorDocToText };

export interface CreateNoteParams {
  id?: string | undefined;
  title?: string | undefined;
  tags?: string[] | undefined;
  section?: string | undefined;
  initialText?: string | undefined;
  pinned?: boolean | undefined;
}

export interface SectionGroup {
  name: string;
  isPinned: boolean;
  notes: NoteMetadata[];
}

/**
 * Creates a valid, canonical GeneralNote domain entity.
 */
export function createDefaultGeneralNote(params?: CreateNoteParams): GeneralNote {
  const now = new Date().toISOString();
  return {
    id: params?.id ?? generateId("not"),
    schemaVersion: 1,
    title: params?.title?.trim() || "Untitled Note",
    tags: normalizeTagList(params?.tags ?? []),
    section: params?.section?.trim() || "General",
    pinned: params?.pinned ?? false,
    content: textToProseMirrorDoc(params?.initialText ?? ""),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Sorts note metadata items: pinned notes always appear first,
 * followed by either most recently updated ("recent") or alphabetical ("title").
 */
export function sortNotes(
  notes: NoteMetadata[],
  order: "recent" | "title" = "title"
): NoteMetadata[] {
  return [...notes].sort((a, b) => {
    // 1. Pinned status takes highest precedence
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }

    // 2. Secondary sort according to preference
    if (order === "title") {
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    }

    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

/**
 * Groups notes into folders/sections.
 * - Pinned sections are ordered strictly by their pinned order in `pinnedSections`.
 * - Unpinned sections are ordered alphabetically.
 * - Inside each section, notes are sorted according to `sortBy` ("title" alphabetical, or "updatedAt" most recent).
 */
export function groupNotesBySection(
  notes: NoteMetadata[],
  pinnedSections: string[] = [],
  customSections: string[] = [],
  sortBy: "title" | "updatedAt" = "title"
): SectionGroup[] {
  // 1. Aggregate unique section names (defaulting empty/missing to "General")
  const set = new Set<string>();
  set.add("General");

  for (const cs of customSections) {
    const trimmed = cs.trim();
    if (trimmed) set.add(trimmed);
  }

  for (const n of notes) {
    const s = n.section?.trim() || "General";
    set.add(s);
  }

  const allSections = Array.from(set);

  // 2. Pinned sections in the exact order they were pinned
  const pinnedList = pinnedSections.filter((name) => allSections.includes(name));

  // 3. Unpinned sections sorted alphabetically
  const unpinnedList = allSections
    .filter((name) => !pinnedList.includes(name))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const orderedSectionNames = [...pinnedList, ...unpinnedList];

  // 4. Build groups
  return orderedSectionNames.map((sectionName) => {
    const sectionNotes = notes.filter(
      (n) => (n.section?.trim() || "General") === sectionName
    );

    // Sort notes inside section
    const sorted = [...sectionNotes].sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return {
      name: sectionName,
      isPinned: pinnedList.includes(sectionName),
      notes: sorted,
    };
  });
}

/**
 * Filters a list of notes by a search query string.
 * Supports matching in title or normalized tags.
 */
export function filterNotes(notes: NoteMetadata[], rawQuery: string): NoteMetadata[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return notes;
  }

  const cleanTagQuery = query.startsWith("#") ? query.slice(1) : query;

  return notes.filter((note) => {
    const titleMatch = note.title.toLowerCase().includes(query);
    const tagMatch = note.tags.some(
      (tag) => tag.toLowerCase().includes(cleanTagQuery)
    );
    const sectionMatch = (note.section || "General").toLowerCase().includes(query);
    return titleMatch || tagMatch || sectionMatch;
  });
}

/**
 * Filters notes matching an array of tags with either "and" (all tags) or "or" (any tag) match mode.
 */
export function filterNotesByTags(
  notes: NoteMetadata[],
  tags: string[],
  matchMode: "and" | "or" = "and"
): NoteMetadata[] {
  if (!tags || tags.length === 0) {
    return notes;
  }
  const cleanTags = tags.map((t) => (t.startsWith("#") ? t.slice(1).toLowerCase() : t.toLowerCase()));
  return notes.filter((note) => {
    const noteTagsLower = note.tags.map((t) => t.toLowerCase());
    return matchMode === "and"
      ? cleanTags.every((ct) => noteTagsLower.includes(ct))
      : cleanTags.some((ct) => noteTagsLower.includes(ct));
  });
}
