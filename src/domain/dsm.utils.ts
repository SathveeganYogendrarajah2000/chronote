import type { ProseMirrorNode } from "./document.types";
import type { DsmDocument, DsmEntry } from "./dsm.types";
import { generateId } from "./id.utils";
import { normalizeTagList } from "./tagNormalizer";

/**
 * Validates whether a given string is a valid Gregorian ISO calendar date (YYYY-MM-DD).
 * Rejects out-of-bounds dates such as 2026-02-30 or 2026-13-40.
 */
export function isValidIsoDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Returns formatted date components and relative indicators for a given ISO date string.
 * Strictly uses UTC representation to avoid timezone shifts.
 */
export function formatDateLabel(dateStr: string): {
  dayOfWeek: string;
  formattedDate: string;
  isToday: boolean;
  isYesterday: boolean;
} {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = days[date.getUTCDay()] ?? "";
  const formattedDate = `${months[month - 1] ?? ""} ${day}, ${year}`;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(
    yesterdayDate.getMonth() + 1
  ).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;

  return {
    dayOfWeek,
    formattedDate,
    isToday: dateStr === todayStr,
    isYesterday: dateStr === yesterdayStr,
  };
}

/**
 * Recursively extracts plain text from a ProseMirrorNode tree.
 */
function extractFirstMeaningfulText(node: ProseMirrorNode): string {
  if (node.text && node.text.trim().length > 0) {
    return node.text.trim();
  }

  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      const extracted = extractFirstMeaningfulText(child);
      if (extracted.length > 0) {
        return extracted;
      }
    }
  }

  return "";
}

/**
 * Derives an informative summary preview string from an entry's ProseMirror content tree.
 * Truncates to 120 characters with ellipsis (ADR-006).
 */
export function deriveDsmEntryPreview(content: ProseMirrorNode): string {
  const rawText = extractFirstMeaningfulText(content);
  if (!rawText) {
    return "No stand-up notes recorded yet.";
  }

  const cleanText = rawText.replace(/\s+/g, " ").trim();
  if (cleanText.length <= 120) {
    return cleanText;
  }

  return `${cleanText.slice(0, 117).trimEnd()}...`;
}

/**
 * Converts a plain or multi-line text string into a standard ProseMirror JSON document tree.
 */
export function textToProseMirrorDoc(text: string): ProseMirrorNode {
  const lines = text.split(/\r?\n/);
  const contentNodes: ProseMirrorNode[] = [];

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed.length === 0) {
      contentNodes.push({
        type: "paragraph",
        attrs: { id: generateId("blk") },
        content: [],
      });
    } else {
      contentNodes.push({
        type: "paragraph",
        attrs: { id: generateId("blk") },
        content: [
          {
            type: "text",
            text: trimmed,
          },
        ],
      });
    }
  }

  if (contentNodes.length === 0) {
    contentNodes.push({
      type: "paragraph",
      attrs: { id: generateId("blk") },
      content: [],
    });
  }

  return {
    type: "doc",
    content: contentNodes,
  };
}

/**
 * Recursively extracts plain text from an inline node or sub-tree.
 */
function extractInlineText(node: ProseMirrorNode): string {
  if (node.text) {
    return node.text;
  }
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractInlineText).join("");
  }
  return "";
}

/**
 * Converts a ProseMirror document tree back to readable multi-line plain text.
 */
export function proseMirrorDocToText(node: ProseMirrorNode): string {
  if (!node || !node.content || !Array.isArray(node.content)) {
    return "";
  }

  const lines: string[] = [];

  function processBlock(blockNode: ProseMirrorNode) {
    // If it's a table container
    if (blockNode.type === "table") {
      if (blockNode.content && Array.isArray(blockNode.content)) {
        for (const row of blockNode.content) {
          processBlock(row);
        }
      }
      return;
    }

    // If it's a table row, format cells separated by pipe
    if (blockNode.type === "tableRow") {
      if (blockNode.content && Array.isArray(blockNode.content)) {
        const rowCells: string[] = [];
        for (const cell of blockNode.content) {
          rowCells.push(extractInlineText(cell).trim());
        }
        lines.push(rowCells.join(" | "));
      }
      return;
    }

    // If it's a list or container node with children blocks
    if (
      blockNode.type === "bulletList" ||
      blockNode.type === "orderedList" ||
      blockNode.type === "taskList" ||
      blockNode.type === "listItem" ||
      blockNode.type === "taskItem"
    ) {
      if (blockNode.content && Array.isArray(blockNode.content)) {
        for (const child of blockNode.content) {
          processBlock(child);
        }
      }
      return;
    }

    const text = extractInlineText(blockNode);
    lines.push(text);
  }

  for (const block of node.content) {
    processBlock(block);
  }

  return lines.join("\n");
}

/**
 * Creates a default DsmEntry for the specified ISO date.
 */
export function createDefaultDsmEntry(
  date: string,
  tags: string[] = [],
  initialText = ""
): DsmEntry {
  const now = new Date().toISOString();
  return {
    id: generateId("ent"),
    date,
    tags: normalizeTagList(tags),
    collapsed: false,
    content: textToProseMirrorDoc(initialText),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a default empty DsmDocument container.
 */
export function createDefaultDsmDocument(): DsmDocument {
  const now = new Date().toISOString();
  return {
    id: "dsm_master",
    schemaVersion: 1,
    title: "Daily Stand-up Journal",
    createdAt: now,
    updatedAt: now,
    entries: [],
  };
}

/**
 * Sorts an array of DSM entries chronologically.
 * Default is "desc" (newest date first).
 */
export function sortDsmEntries(
  entries: DsmEntry[],
  order: "desc" | "asc" = "desc"
): DsmEntry[] {
  return [...entries].sort((a, b) => {
    return order === "desc"
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date);
  });
}

/**
 * Filters DSM entries matching an array of tags with either "and" (all tags) or "or" (any tag) match mode.
 */
export function filterDsmEntriesByTags(
  entries: DsmEntry[],
  tags: string[],
  matchMode: "and" | "or" = "and"
): DsmEntry[] {
  if (!tags || tags.length === 0) {
    return entries;
  }
  const cleanTags = tags.map((t) => (t.startsWith("#") ? t.slice(1).toLowerCase() : t.toLowerCase()));
  return entries.filter((entry) => {
    const entryTagsLower = entry.tags.map((t) => t.toLowerCase());
    return matchMode === "and"
      ? cleanTags.every((ct) => entryTagsLower.includes(ct))
      : cleanTags.some((ct) => entryTagsLower.includes(ct));
  });
}

