export interface WorkspaceSettings {
  editorFontSize: number;         // Default: 15
  editorLineHeight: number;       // Default: 1.6
  theme: "dark" | "light" | "system"; // Default: "system"
  dsmSortOrder: "desc" | "asc";   // Default: "desc" (newest date on top)
  autosaveIntervalMs: number;     // Default: 800
  noteSortBy?: "title" | "updatedAt"; // Default: "title" (alphabetical)
  pinnedSections?: string[];      // Ordered list of pinned folder/section names
  customSections?: string[];      // Created sections even if empty
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  editorFontSize: 15,
  editorLineHeight: 1.6,
  theme: "dark",
  dsmSortOrder: "desc",
  autosaveIntervalMs: 800,
  noteSortBy: "title",
  pinnedSections: [],
  customSections: [],
};

export interface Workspace {
  readonly id: string;            // Prefixed e.g. "wsp_01JC87V1M4P9X7..."
  readonly schemaVersion: number; // Currently 1
  name: string;                   // User-defined workspace name
  path: string;                   // Absolute local filesystem path
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
  settings: WorkspaceSettings;
}
