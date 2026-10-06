import type { GeneralNote } from "./note.types";
import type { DsmDocument, DsmEntry } from "./dsm.types";

export type ConflictResolutionChoice = "local" | "remote" | "both" | "custom";

export interface ConflictingBlockItem {
  id: string;
  blockType: string;
  localText: string;
  remoteText: string;
  localBlock: any;
  remoteBlock: any;
  chosen: ConflictResolutionChoice;
  customText?: string;
}

export interface ThreeWayDiffResult {
  hasTitleConflict: boolean;
  localTitle: string;
  remoteTitle: string;
  chosenTitleChoice: "local" | "remote" | "custom";
  customTitle?: string;

  hasTagConflict: boolean;
  localTags: string[];
  remoteTags: string[];
  chosenTagsChoice: "local" | "remote" | "union";

  hasContentConflict: boolean;
  conflictingBlocks: ConflictingBlockItem[];
  cleanMergedBlocksCount: number;
}

/**
 * Extracts plain text preview from a ProseMirror block node.
 */
function extractBlockText(node: any): string {
  if (!node) return "";
  if (typeof node.text === "string") return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(extractBlockText).join("");
  }
  return "";
}

/**
 * Analyzes two versions of a GeneralNote (local and conflicted remote) and produces
 * a structured 3-way diff breakdown with automatic clean merges where possible.
 */
export function analyzeGeneralNoteDiff(
  localNote: GeneralNote,
  remoteNote: GeneralNote,
  _baseNote?: GeneralNote | null
): ThreeWayDiffResult {
  const hasTitleConflict = localNote.title !== remoteNote.title;

  // Compare tags
  const remoteTagSet = new Set(remoteNote.tags);
  const tagsIdentical =
    localNote.tags.length === remoteNote.tags.length &&
    localNote.tags.every((t) => remoteTagSet.has(t));

  const localBlocks: any[] = localNote.content?.content || [];
  const remoteBlocks: any[] = remoteNote.content?.content || [];

  const conflictingBlocks: ConflictingBlockItem[] = [];
  let cleanMergedCount = 0;

  const maxLen = Math.max(localBlocks.length, remoteBlocks.length);

  for (let i = 0; i < maxLen; i++) {
    const lBlock = localBlocks[i];
    const rBlock = remoteBlocks[i];

    if (!lBlock && rBlock) {
      // Remote added a block that local doesn't have
      cleanMergedCount++;
      continue;
    }

    if (lBlock && !rBlock) {
      // Local added a block that remote doesn't have
      cleanMergedCount++;
      continue;
    }

    // Both exist at this ordinal position
    const lJson = JSON.stringify(lBlock);
    const rJson = JSON.stringify(rBlock);

    if (lJson === rJson) {
      // Unchanged identical block
      cleanMergedCount++;
    } else {
      // Content conflict on this block
      const lText = extractBlockText(lBlock);
      const rText = extractBlockText(rBlock);
      const blockId = lBlock?.attrs?.id || rBlock?.attrs?.id || `conflict_blk_${i}`;
      const blockType = lBlock?.type || rBlock?.type || "paragraph";

      conflictingBlocks.push({
        id: blockId,
        blockType,
        localText: lText,
        remoteText: rText,
        localBlock: lBlock,
        remoteBlock: rBlock,
        chosen: "local",
      });
    }
  }

  return {
    hasTitleConflict,
    localTitle: localNote.title,
    remoteTitle: remoteNote.title,
    chosenTitleChoice: "local",

    hasTagConflict: !tagsIdentical,
    localTags: [...localNote.tags],
    remoteTags: [...remoteNote.tags],
    chosenTagsChoice: tagsIdentical ? "local" : "union",

    hasContentConflict: conflictingBlocks.length > 0,
    conflictingBlocks,
    cleanMergedBlocksCount: cleanMergedCount,
  };
}

/**
 * Synthesizes the finalized merged GeneralNote from user wizard selections.
 */
export function buildMergedGeneralNote(
  localNote: GeneralNote,
  remoteNote: GeneralNote,
  diffResult: ThreeWayDiffResult
): GeneralNote {
  // 1. Resolve Title
  let title = localNote.title;
  if (diffResult.chosenTitleChoice === "remote") {
    title = remoteNote.title;
  } else if (diffResult.chosenTitleChoice === "custom" && diffResult.customTitle) {
    title = diffResult.customTitle;
  }

  // 2. Resolve Tags
  let tags: string[] = [];
  if (diffResult.chosenTagsChoice === "remote") {
    tags = [...remoteNote.tags];
  } else if (diffResult.chosenTagsChoice === "union") {
    const set = new Set([...localNote.tags, ...remoteNote.tags]);
    tags = Array.from(set);
  } else {
    tags = [...localNote.tags];
  }

  // 3. Resolve Content Blocks
  const localBlocks: any[] = localNote.content?.content || [];
  const remoteBlocks: any[] = remoteNote.content?.content || [];
  const mergedBlocks: any[] = [];

  const conflictMap = new Map<string, ConflictingBlockItem>();
  diffResult.conflictingBlocks.forEach((c) => conflictMap.set(c.id, c));

  const maxLen = Math.max(localBlocks.length, remoteBlocks.length);

  for (let i = 0; i < maxLen; i++) {
    const lBlock = localBlocks[i];
    const rBlock = remoteBlocks[i];

    if (!lBlock && rBlock) {
      mergedBlocks.push(rBlock);
      continue;
    }

    if (lBlock && !rBlock) {
      mergedBlocks.push(lBlock);
      continue;
    }

    const blockId = lBlock?.attrs?.id || rBlock?.attrs?.id || `conflict_blk_${i}`;
    const conflict = conflictMap.get(blockId);

    if (conflict) {
      if (conflict.chosen === "remote") {
        mergedBlocks.push(rBlock);
      } else if (conflict.chosen === "both") {
        mergedBlocks.push(lBlock);
        mergedBlocks.push(rBlock);
      } else if (conflict.chosen === "custom" && conflict.customText) {
        mergedBlocks.push({
          type: "paragraph",
          attrs: lBlock?.attrs || {},
          content: [{ type: "text", text: conflict.customText }],
        });
      } else {
        // Default "local"
        mergedBlocks.push(lBlock);
      }
    } else {
      // Unchanged clean block
      mergedBlocks.push(lBlock);
    }
  }

  return {
    ...localNote,
    title,
    tags,
    content: {
      type: "doc",
      content: mergedBlocks,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Merges two versions of Daily Stand-up journal documents.
 * Automatically combines distinct date entries and merges overlapping date entries.
 */
export function buildMergedDsmDocument(
  localDoc: DsmDocument,
  remoteDoc: DsmDocument
): DsmDocument {
  const mergedEntriesMap = new Map<string, DsmEntry>();

  // 1. Add all local entries
  localDoc.entries.forEach((entry) => {
    mergedEntriesMap.set(entry.date, { ...entry });
  });

  // 2. Combine remote entries
  remoteDoc.entries.forEach((remoteEntry) => {
    const existing = mergedEntriesMap.get(remoteEntry.date);
    if (!existing) {
      mergedEntriesMap.set(remoteEntry.date, { ...remoteEntry });
    } else {
      // If date exists in both, merge tags and concatenate content blocks
      const combinedTags = Array.from(new Set([...existing.tags, ...remoteEntry.tags]));
      const existingBlocks = existing.content?.content || [];
      const remoteBlocks = remoteEntry.content?.content || [];

      mergedEntriesMap.set(remoteEntry.date, {
        ...existing,
        tags: combinedTags,
        content: {
          type: "doc",
          content: [...existingBlocks, ...remoteBlocks],
        },
        updatedAt:
          new Date(remoteEntry.updatedAt) > new Date(existing.updatedAt)
            ? remoteEntry.updatedAt
            : existing.updatedAt,
      });
    }
  });

  // Sort entries descending by date (newest first)
  const sortedEntries = Array.from(mergedEntriesMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return {
    ...localDoc,
    entries: sortedEntries,
    updatedAt: new Date().toISOString(),
  };
}
