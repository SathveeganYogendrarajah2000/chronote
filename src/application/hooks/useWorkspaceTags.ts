import { useMemo } from "react";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { useDsmStore } from "@application/stores/useDsmStore";
import { useCoursesStore } from "@application/stores/useCoursesStore";

export interface WorkspaceTagInfo {
  tag: string;
  count: number;
}

/**
 * Custom hook aggregating all unique tags across the active workspace
 * from General Notes, Daily Stand-up entries, and Courses/Topics, sorted by frequency.
 */
export function useWorkspaceTags(): WorkspaceTagInfo[] {
  const { recentNotes } = useWorkspaceStore();
  const { dsmDoc } = useDsmStore();
  const { coursesDoc } = useCoursesStore();

  return useMemo(() => {
    const map = new Map<string, number>();

    // Aggregate from General Notes
    for (const note of recentNotes) {
      if (note.tags) {
        for (const tag of note.tags) {
          map.set(tag, (map.get(tag) ?? 0) + 1);
        }
      }
    }

    // Aggregate from DSM Entries
    if (dsmDoc?.entries) {
      for (const entry of dsmDoc.entries) {
        if (entry.tags) {
          for (const tag of entry.tags) {
            map.set(tag, (map.get(tag) ?? 0) + 1);
          }
        }
      }
    }

    // Aggregate from Courses Topics & Resources
    if (coursesDoc?.topics) {
      for (const topic of coursesDoc.topics) {
        if (topic.tags) {
          for (const tag of topic.tags) {
            map.set(tag, (map.get(tag) ?? 0) + 1);
          }
        }
      }
    }
    if (coursesDoc?.resources) {
      for (const res of coursesDoc.resources) {
        if (res.tags) {
          for (const tag of res.tags) {
            map.set(tag, (map.get(tag) ?? 0) + 1);
          }
        }
      }
    }

    return Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [recentNotes, dsmDoc?.entries, coursesDoc?.topics, coursesDoc?.resources]);
}
