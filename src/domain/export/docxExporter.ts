import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  ShadingType,
  Packer,
} from "docx";
import type { ProseMirrorNode } from "../document.types";
import type { DsmEntry } from "../dsm.types";
import type { GeneralNote } from "../note.types";
import type { DocxExportOptions } from "./export.types";

const FONT_BODY = "Calibri";
const FONT_CODE = "Consolas";

/**
 * Transforms ProseMirror marks into TextRun formatting properties.
 */
function createTextRunFromNode(node: ProseMirrorNode): TextRun {
  const text = node.text ?? "";
  const marks = node.marks || [];

  let isBold = false;
  let isItalic = false;
  let isStrike = false;
  let isCode = false;
  let font = FONT_BODY;
  let color = "1A1A1A";

  for (const mark of marks) {
    if (mark.type === "bold") isBold = true;
    if (mark.type === "italic") isItalic = true;
    if (mark.type === "strike") isStrike = true;
    if (mark.type === "code") {
      isCode = true;
      font = FONT_CODE;
    }
    if (mark.type === "link" || mark.type === "internalLink") {
      color = "0969DA"; // GitHub link blue
    }
  }

  const runOptions: any = {
    text,
    bold: isBold,
    italics: isItalic,
    strike: isStrike,
    font,
    color,
  };

  if (isCode) {
    runOptions.shading = {
      type: ShadingType.CLEAR,
      fill: "F0F2F5",
    };
  }

  return new TextRun(runOptions);
}

/**
 * Translates inline nodes inside a block to an array of TextRuns.
 */
function createTextRunsFromInline(nodes?: ProseMirrorNode[]): TextRun[] {
  if (!nodes || nodes.length === 0) return [];
  const runs: TextRun[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      runs.push(createTextRunFromNode(node));
    } else if (node.type === "hardBreak") {
      runs.push(new TextRun({ break: 1 }));
    }
  }

  return runs;
}

/**
 * Creates a styled code block in DOCX: a single-cell shaded table box
 * with #F4F6F8 background, #D0D7DE border, and monospace font (Consolas).
 */
function createCodeBlockDocx(node: ProseMirrorNode): Table {
  const code = node.content?.map((c) => c.text ?? "").join("") || "";
  const lines = code.split("\n");

  const paragraphs = lines.map((line) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: line,
          font: FONT_CODE,
          size: 20, // 10pt
          color: "24292F",
        }),
      ],
      spacing: {
        line: 240,
        before: 0,
        after: 0,
      },
    });
  });

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: paragraphs.length > 0 ? paragraphs : [new Paragraph({})],
            shading: {
              type: ShadingType.CLEAR,
              fill: "F4F6F8",
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "D0D7DE" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "D0D7DE" },
              left: { style: BorderStyle.SINGLE, size: 4, color: "D0D7DE" },
              right: { style: BorderStyle.SINGLE, size: 4, color: "D0D7DE" },
            },
            margins: {
              top: 140,
              bottom: 140,
              left: 200,
              right: 200,
            },
          }),
        ],
      }),
    ],
  });
}

/**
 * Creates a styled blockquote with a 3pt left accent border (#3B82F6) and indent.
 */
function createBlockquoteDocx(node: ProseMirrorNode): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  if (!node.content) return paragraphs;

  for (const child of node.content) {
    const runs = createTextRunsFromInline(child.content);
    paragraphs.push(
      new Paragraph({
        children: runs,
        indent: { left: 400 },
        border: {
          left: {
            color: "3B82F6",
            space: 12,
            style: BorderStyle.SINGLE,
            size: 24, // 3pt
          },
        },
        spacing: { before: 80, after: 80 },
      })
    );
  }

  return paragraphs;
}

/**
 * Creates a standard DOCX table from a ProseMirror table node.
 */
function createTableDocx(node: ProseMirrorNode): Table {
  if (!node.content) {
    return new Table({ rows: [] });
  }

  const tableRows: TableRow[] = [];

  for (let rIdx = 0; rIdx < node.content.length; rIdx++) {
    const rowNode = node.content[rIdx];
    if (rowNode.type !== "tableRow" || !rowNode.content) continue;

    const isHeaderRow = rIdx === 0;
    const cells: TableCell[] = [];

    for (const cellNode of rowNode.content) {
      const cellParagraphs: Paragraph[] = [];
      if (cellNode.content) {
        for (const p of cellNode.content) {
          const runs = createTextRunsFromInline(p.content);
          cellParagraphs.push(
            new Paragraph({
              children: runs,
              spacing: { before: 40, after: 40 },
            })
          );
        }
      }

      const cellOptions: any = {
        children: cellParagraphs.length > 0 ? cellParagraphs : [new Paragraph({})],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: "D0D7DE" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "D0D7DE" },
          left: { style: BorderStyle.SINGLE, size: 4, color: "D0D7DE" },
          right: { style: BorderStyle.SINGLE, size: 4, color: "D0D7DE" },
        },
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
      };

      if (isHeaderRow) {
        cellOptions.shading = { type: ShadingType.CLEAR, fill: "F0F4F8" };
      }

      cells.push(new TableCell(cellOptions));
    }

    tableRows.push(
      new TableRow({
        children: cells,
        tableHeader: isHeaderRow,
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
}

/**
 * Transforms ProseMirror nodes to DOCX section children (Paragraph | Table).
 */
function transformNodeToDocxElements(
  node: ProseMirrorNode,
  listPrefix: string = ""
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  switch (node.type) {
    case "doc": {
      if (node.content) {
        for (const child of node.content) {
          elements.push(...transformNodeToDocxElements(child));
        }
      }
      break;
    }

    case "paragraph": {
      const runs = createTextRunsFromInline(node.content);
      elements.push(
        new Paragraph({
          children: runs,
          spacing: { before: 80, after: 120 },
        })
      );
      break;
    }

    case "heading": {
      const level = (node.attrs?.level as number) || 1;
      const runs = createTextRunsFromInline(node.content);
      let headingLevel: any = HeadingLevel.HEADING_1;
      if (level === 2) headingLevel = HeadingLevel.HEADING_2;
      else if (level === 3) headingLevel = HeadingLevel.HEADING_3;
      else if (level === 4) headingLevel = HeadingLevel.HEADING_4;
      else if (level === 5) headingLevel = HeadingLevel.HEADING_5;
      else if (level >= 6) headingLevel = HeadingLevel.HEADING_6;

      elements.push(
        new Paragraph({
          heading: headingLevel,
          children: runs,
          spacing: { before: 240, after: 120 },
        })
      );
      break;
    }

    case "codeBlock": {
      elements.push(createCodeBlockDocx(node));
      // Add empty paragraph spacer after code block
      elements.push(new Paragraph({ spacing: { after: 120 } }));
      break;
    }

    case "blockquote": {
      elements.push(...createBlockquoteDocx(node));
      break;
    }

    case "bulletList": {
      if (node.content) {
        for (const child of node.content) {
          elements.push(...transformNodeToDocxElements(child, "• "));
        }
      }
      break;
    }

    case "orderedList": {
      if (node.content) {
        const start = (node.attrs?.start as number) || 1;
        for (let idx = 0; idx < node.content.length; idx++) {
          elements.push(
            ...transformNodeToDocxElements(node.content[idx], `${start + idx}. `)
          );
        }
      }
      break;
    }

    case "taskList": {
      if (node.content) {
        for (const child of node.content) {
          elements.push(...transformNodeToDocxElements(child, "task"));
        }
      }
      break;
    }

    case "listItem": {
      if (node.content) {
        for (let i = 0; i < node.content.length; i++) {
          const p = node.content[i];
          const runs = createTextRunsFromInline(p.content);
          if (i === 0) {
            runs.unshift(new TextRun({ text: listPrefix, bold: true }));
          }
          elements.push(
            new Paragraph({
              children: runs,
              indent: { left: 360 },
              spacing: { before: 40, after: 40 },
            })
          );
        }
      }
      break;
    }

    case "taskItem": {
      const isChecked = Boolean(node.attrs?.checked);
      const symbol = isChecked ? "☑ " : "☐ ";
      if (node.content) {
        for (let i = 0; i < node.content.length; i++) {
          const p = node.content[i];
          const runs = createTextRunsFromInline(p.content);
          if (i === 0) {
            runs.unshift(
              new TextRun({
                text: symbol,
                font: "Segoe UI Symbol",
                color: isChecked ? "2E7D32" : "555555",
              })
            );
          }
          elements.push(
            new Paragraph({
              children: runs,
              indent: { left: 360 },
              spacing: { before: 40, after: 40 },
            })
          );
        }
      }
      break;
    }

    case "horizontalRule": {
      elements.push(
        new Paragraph({
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: "E1E4E8",
            },
          },
          spacing: { before: 180, after: 180 },
        })
      );
      break;
    }

    case "table": {
      elements.push(createTableDocx(node));
      elements.push(new Paragraph({ spacing: { after: 120 } }));
      break;
    }

    default:
      if (node.content) {
        for (const child of node.content) {
          elements.push(...transformNodeToDocxElements(child));
        }
      }
      break;
  }

  return elements;
}

/**
 * Creates tags callout paragraph.
 */
function createTagsDocx(tags: string[]): Paragraph | null {
  if (!tags || tags.length === 0) return null;

  return new Paragraph({
    children: [
      new TextRun({ text: "Tags: ", bold: true, color: "57606A" }),
      ...tags.map(
        (t) =>
          new TextRun({
            text: `#${t} `,
            color: "0969DA",
            font: FONT_CODE,
            size: 18,
          })
      ),
    ],
    border: {
      left: {
        color: "D0D7DE",
        size: 12,
        style: BorderStyle.SINGLE,
        space: 10,
      },
    },
    indent: { left: 240 },
    spacing: { before: 60, after: 180 },
  });
}

/**
 * Exports a GeneralNote to a DOCX Document structure.
 */
export function buildNoteDocx(note: GeneralNote, options?: DocxExportOptions): Document {
  const children: (Paragraph | Table)[] = [];

  // Title
  if (options?.includeTitle !== false) {
    children.push(
      new Paragraph({
        text: note.title,
        heading: HeadingLevel.TITLE,
        spacing: { before: 100, after: 200 },
      })
    );
  }

  // Tags
  if (options?.includeTags !== false && note.tags.length > 0) {
    const tagsP = createTagsDocx(note.tags);
    if (tagsP) children.push(tagsP);
  }

  // Content
  children.push(...transformNodeToDocxElements(note.content));

  return new Document({
    creator: options?.author || "Chronote",
    description: `Chronote Export - ${note.title}`,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1 inch
          },
        },
        children,
      },
    ],
  });
}

/**
 * Exports a single DSM entry to a DOCX Document.
 */
export function buildDsmEntryDocx(entry: DsmEntry, options?: DocxExportOptions): Document {
  const children: (Paragraph | Table)[] = [];

  // Date Header
  if (options?.includeTitle !== false) {
    children.push(
      new Paragraph({
        text: `Daily Stand-up — ${entry.date}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 100, after: 180 },
      })
    );
  }

  // Tags
  if (options?.includeTags !== false && entry.tags.length > 0) {
    const tagsP = createTagsDocx(entry.tags);
    if (tagsP) children.push(tagsP);
  }

  // Content
  children.push(...transformNodeToDocxElements(entry.content));

  return new Document({
    creator: options?.author || "Chronote",
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children,
      },
    ],
  });
}

/**
 * Exports multiple DSM entries spanning a date range to a DOCX Document.
 */
export function buildDsmRangeDocx(
  entries: DsmEntry[],
  dateRange?: { from: string; to: string },
  options?: DocxExportOptions
): Document {
  let filtered = [...entries];
  if (dateRange) {
    filtered = filtered.filter(
      (e) => e.date >= dateRange.from && e.date <= dateRange.to
    );
  }
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  const children: (Paragraph | Table)[] = [];
  const titleText = dateRange
    ? `DSM Stand-up Journal (${dateRange.from} to ${dateRange.to})`
    : "DSM Stand-up Journal";

  children.push(
    new Paragraph({
      text: titleText,
      heading: HeadingLevel.TITLE,
      spacing: { before: 100, after: 240 },
    })
  );

  for (let i = 0; i < filtered.length; i++) {
    const entry = filtered[i];
    children.push(
      new Paragraph({
        text: entry.date,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
      })
    );

    if (options?.includeTags !== false && entry.tags.length > 0) {
      const tagsP = createTagsDocx(entry.tags);
      if (tagsP) children.push(tagsP);
    }

    children.push(...transformNodeToDocxElements(entry.content));

    if (i < filtered.length - 1) {
      children.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 4, color: "E1E4E8" },
          },
          spacing: { before: 160, after: 160 },
        })
      );
    }
  }

  return new Document({
    creator: options?.author || "Chronote",
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children,
      },
    ],
  });
}

/**
 * Generates raw DOCX Uint8Array bytes from a Document instance.
 */
export async function packDocxToUint8Array(doc: Document): Promise<Uint8Array> {
  const buffer = await Packer.toArrayBuffer(doc);
  return new Uint8Array(buffer);
}
