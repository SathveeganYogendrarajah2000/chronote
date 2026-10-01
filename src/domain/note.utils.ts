import type { GeneralNote, NoteMetadata } from "./note.types";
import { generateId } from "./id.utils";
import { normalizeTagList } from "./tagNormalizer";
import { textToProseMirrorDoc, proseMirrorDocToText } from "./dsm.utils";

export { textToProseMirrorDoc, proseMirrorDocToText };

export interface CreateNoteParams {
  id?: string | undefined;
  title?: string | undefined;
  tags?: string[] | undefined;
  initialText?: string | undefined;
  pinned?: boolean | undefined;
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
  order: "recent" | "title" = "recent"
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
    return titleMatch || tagMatch;
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

