export type DocumentType = "dsm" | "general" | "courses";

export interface TabItem {
  readonly id: string;            // Unique tab instance ID
  readonly documentId: string;    // "dsm_master" or general note ID or "courses_master"
  readonly documentType: DocumentType;
  title: string;                  // Display title
  isPinned: boolean;              // Pinned tabs (like DSM) cannot be closed accidentally
  scrollPosition?: number | undefined; // Restored upon switching back to this tab
}

export interface TabSessionState {
  tabs: TabItem[];
  activeTabId: string;
  closedTabHistory: TabItem[];    // Reopen closed tab stack (max 20)
}

export const DSM_TAB_ID = "tab_dsm_master";
export const DSM_DOCUMENT_ID = "dsm_master";

export const COURSES_TAB_ID = "tab_courses_master";
export const COURSES_DOCUMENT_ID = "courses_master";

export function createDsmTab(): TabItem {
  return {
    id: DSM_TAB_ID,
    documentId: DSM_DOCUMENT_ID,
    documentType: "dsm",
    title: "Daily Stand-up",
    isPinned: true,
  };
}

export function createCoursesTab(): TabItem {
  return {
    id: COURSES_TAB_ID,
    documentId: COURSES_DOCUMENT_ID,
    documentType: "courses",
    title: "Courses & Learning",
    isPinned: false,
  };
}

