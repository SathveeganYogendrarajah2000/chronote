import type { ProseMirrorNode } from "./document.types";

export interface DelimitedParseOptions {
  delimiter?: string | "auto";
  hasHeaderRow?: boolean;
  trimCells?: boolean;
}

export interface ParseDelimitedResult {
  headers?: string[] | undefined;
  rows: string[][];
  allRows: string[][];
  detectedDelimiter: string;
  columnCount: number;
  rowCount: number;
  proseMirrorTable: ProseMirrorNode;
}

/**
 * Standard candidate delimiters tested during auto-detection.
 */
const CANDIDATE_DELIMITERS = [",", "\t", "|", ";", ":"];

/**
 * Checks whether a line appears to be a Markdown table separator line (e.g. `|---|:---|---:|`).
 */
function isMarkdownSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("-")) return false;
  // Match lines containing dashes, colons, pipes, and whitespace only
  return /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(trimmed) || /^(\s*:?-+:?\s*\|?)+$/.test(trimmed);
}

/**
 * Auto-detects the most likely delimiter from raw text.
 */
export function detectDelimiter(rawText: string): string {
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return ",";

  // Check if text looks like a Markdown pipe table
  const pipeCount = (lines[0]?.match(/\|/g) || []).length;
  if (pipeCount >= 2 && lines.some((l) => isMarkdownSeparatorRow(l))) {
    return "|";
  }

  let bestDelimiter = ",";
  let bestScore = -1;

  for (const delim of CANDIDATE_DELIMITERS) {
    const counts = lines.slice(0, 15).map((line) => {
      // Approximate count outside of quotes
      let inQuotes = false;
      let count = 0;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (!inQuotes && line.slice(i, i + delim.length) === delim) {
          count++;
          i += delim.length - 1;
        }
      }
      return count;
    });

    const nonZeroCounts = counts.filter((c) => c > 0);
    if (nonZeroCounts.length === 0) continue;

    // Check consistency of counts across lines
    const firstCount = nonZeroCounts[0];
    const isConsistent = nonZeroCounts.every((c) => c === firstCount);
    const avgCount = nonZeroCounts.reduce((a, b) => a + b, 0) / nonZeroCounts.length;

    // Score based on count consistency and number of lines matched
    let score = nonZeroCounts.length * (avgCount + 1);
    if (isConsistent && nonZeroCounts.length > 1) {
      score *= 2.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

/**
 * Parses raw text into a 2D matrix of strings using a specified delimiter.
 * Supports RFC 4180 quotes ("") and multi-line quoted fields.
 */
export function tokenizeDelimitedText(
  rawText: string,
  delimiter: string,
  trimCells = true
): string[][] {
  if (!rawText || rawText.trim().length === 0) {
    return [];
  }

  const isPipe = delimiter === "|";
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  let i = 0;
  const len = rawText.length;
  const delimLen = delimiter.length;

  while (i < len) {
    const char = rawText[i];

    // Handle quote character
    if (char === '"') {
      if (inQuotes) {
        // Lookahead for escaped quote `""`
        if (i + 1 < len && rawText[i + 1] === '"') {
          currentCell += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        inQuotes = true;
        i++;
        continue;
      }
    }

    // Inside quotes: accumulate everything verbatim (including newlines and delimiters)
    if (inQuotes) {
      currentCell += char;
      i++;
      continue;
    }

    // Check for delimiter match
    if (delimLen > 0 && rawText.slice(i, i + delimLen) === delimiter) {
      currentRow.push(trimCells ? currentCell.trim() : currentCell);
      currentCell = "";
      i += delimLen;
      continue;
    }

    // Check for newline (row delimiter)
    if (char === "\r" || char === "\n") {
      if (char === "\r" && i + 1 < len && rawText[i + 1] === "\n") {
        i++; // skip \r of \r\n
      }
      currentRow.push(trimCells ? currentCell.trim() : currentCell);
      currentCell = "";
      rows.push(currentRow);
      currentRow = [];
      i++;
      continue;
    }

    // Regular character
    currentCell += char;
    i++;
  }

  // Push last cell & row if present
  currentRow.push(trimCells ? currentCell.trim() : currentCell);
  rows.push(currentRow);

  // Clean up and normalize rows
  const cleanRows: string[][] = [];

  for (const rawRow of rows) {
    let row = rawRow;

    // For pipe tables: if the row begins and/or ends with pipe, strip empty exterior tokens
    if (isPipe) {
      if (row.length > 1 && row[0] === "") {
        row = row.slice(1);
      }
      if (row.length > 1 && row[row.length - 1] === "") {
        row = row.slice(0, -1);
      }
    }

    // Check if line was a Markdown separator row (e.g. `|---|---|`)
    const rawLine = row.join("|");
    if (isPipe && isMarkdownSeparatorRow(rawLine)) {
      continue;
    }

    // Ignore completely empty rows
    const isRowEmpty = row.every((c) => c.trim().length === 0);
    if (!isRowEmpty) {
      cleanRows.push(row);
    }
  }

  return cleanRows;
}

/**
 * Transforms a 2D string matrix into a canonical ProseMirror Table node.
 */
export function matrixToProseMirrorTable(
  matrix: string[][],
  hasHeaderRow = true
): ProseMirrorNode {
  if (matrix.length === 0) {
    return {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "paragraph", content: [] }],
            },
          ],
        },
      ],
    };
  }

  // Determine max column width across all rows to keep table rectangular
  const maxCols = Math.max(...matrix.map((r) => r.length), 1);

  const tableRows: ProseMirrorNode[] = [];

  for (let rIdx = 0; rIdx < matrix.length; rIdx++) {
    const rawRow = matrix[rIdx] || [];
    const isHeader = hasHeaderRow && rIdx === 0;
    const cellType = isHeader ? "tableHeader" : "tableCell";

    const cells: ProseMirrorNode[] = [];

    for (let cIdx = 0; cIdx < maxCols; cIdx++) {
      const cellText = rawRow[cIdx] ?? "";
      const textNode: ProseMirrorNode[] = cellText
        ? [{ type: "text", text: cellText }]
        : [];

      cells.push({
        type: cellType,
        content: [
          {
            type: "paragraph",
            content: textNode,
          },
        ],
      });
    }

    tableRows.push({
      type: "tableRow",
      content: cells,
    });
  }

  return {
    type: "table",
    content: tableRows,
  };
}

/**
 * Parses raw delimited text (CSV, TSV, pipe, or custom) into a structured table and ProseMirror node.
 */
export function parseDelimitedTextToTable(
  rawText: string,
  options?: DelimitedParseOptions
): ParseDelimitedResult {
  const chosenDelimiter =
    !options?.delimiter || options.delimiter === "auto"
      ? detectDelimiter(rawText)
      : options.delimiter;

  const hasHeaderRow = options?.hasHeaderRow ?? true;
  const trimCells = options?.trimCells ?? true;

  const allRows = tokenizeDelimitedText(rawText, chosenDelimiter, trimCells);

  if (allRows.length === 0) {
    return {
      headers: [],
      rows: [],
      allRows: [],
      detectedDelimiter: chosenDelimiter,
      columnCount: 0,
      rowCount: 0,
      proseMirrorTable: matrixToProseMirrorTable([], hasHeaderRow),
    };
  }

  const maxCols = Math.max(...allRows.map((r) => r.length), 0);
  const normalizedRows = allRows.map((r) => {
    const copy = [...r];
    while (copy.length < maxCols) {
      copy.push("");
    }
    return copy;
  });

  const headers = hasHeaderRow && normalizedRows.length > 0 ? normalizedRows[0] : undefined;
  const rows = hasHeaderRow ? normalizedRows.slice(1) : normalizedRows;

  const proseMirrorTable = matrixToProseMirrorTable(normalizedRows, hasHeaderRow);

  return {
    headers,
    rows,
    allRows: normalizedRows,
    detectedDelimiter: chosenDelimiter,
    columnCount: maxCols,
    rowCount: normalizedRows.length,
    proseMirrorTable,
  };
}

/**
 * Serializes a ProseMirror table node back into delimited text (CSV, TSV, or custom).
 */
export function tableToDelimitedText(
  tableNode: ProseMirrorNode,
  delimiter = ","
): string {
  if (tableNode.type !== "table" || !tableNode.content) {
    return "";
  }

  const lines: string[] = [];

  for (const rowNode of tableNode.content) {
    if (rowNode.type !== "tableRow" || !rowNode.content) continue;

    const rowCells: string[] = [];

    for (const cellNode of rowNode.content) {
      let cellText = "";
      if (cellNode.content) {
        for (const p of cellNode.content) {
          if (p.content) {
            for (const inline of p.content) {
              if (inline.text) cellText += inline.text;
            }
          }
        }
      }

      // Check if escaping is necessary for this delimiter
      const needsQuotes =
        delimiter === ","
          ? cellText.includes(",") || cellText.includes('"') || cellText.includes("\n") || cellText.includes("\r")
          : cellText.includes(delimiter) || cellText.includes('"') || cellText.includes("\n");

      if (needsQuotes) {
        const escaped = cellText.replace(/"/g, '""');
        rowCells.push(`"${escaped}"`);
      } else {
        rowCells.push(cellText);
      }
    }

    lines.push(rowCells.join(delimiter));
  }

  return lines.join("\n");
}
