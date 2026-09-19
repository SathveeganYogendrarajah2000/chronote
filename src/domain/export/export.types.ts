/**
 * Chronote Export Domain Types and Interfaces (Milestone 1.7, ADR-007, EXPORT_SPEC.md).
 */

export type ExportFormat = "markdown" | "docx" | "pdf" | "zip";

export type ExportScope = "activeDocument" | "dsmEntry" | "dsmRange" | "workspace";

export interface MarkdownExportOptions {
  /** When true, preserves raw wiki-syntax `[[Note Title]]`. Otherwise degrades to relative link `[Note Title](./note_title.md)`. */
  wikiLinkMode?: boolean | undefined;
  /** When true, renders tags at the top e.g. `> Tags: #springboot #backend`. */
  includeTags?: boolean | undefined;
  /** When true, includes the document title as H1 heading. */
  includeTitle?: boolean | undefined;
  /** When true, renders YAML frontmatter header. */
  includeFrontmatter?: boolean | undefined;
  /** Custom base path for relative asset links. Defaults to `./assets/`. */
  assetBasePath?: string | undefined;
}

export interface DocxExportOptions {
  includeTitle?: boolean | undefined;
  includeTags?: boolean | undefined;
  author?: string | undefined;
}

export interface PdfExportOptions {
  includeTitle?: boolean | undefined;
  includeTags?: boolean | undefined;
}

export interface DateRangeFilter {
  from: string; // ISO "YYYY-MM-DD"
  to: string;   // ISO "YYYY-MM-DD"
}

export interface ExportExecutionParams {
  format: ExportFormat;
  scope: ExportScope;
  markdownOptions?: MarkdownExportOptions | undefined;
  docxOptions?: DocxExportOptions | undefined;
  dateRange?: DateRangeFilter | undefined;
  selectedEntryDate?: string | undefined;
  outputPath?: string | undefined;
  copyToClipboard?: boolean | undefined;
}

export interface ExportResult {
  success: boolean;
  filePath?: string | undefined;
  copiedToClipboard?: boolean | undefined;
  byteCount?: number | undefined;
  message?: string | undefined;
}

export interface BackupManifest {
  manifestVersion: number;
  chronoteVersion: string;
  backupTimestamp: string;
  workspaceId: string;
  workspaceName: string;
  dsmEntryCount: number;
  generalNotesCount: number;
  assetsCount: number;
}
