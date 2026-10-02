import { useMemo } from "react";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { useDsmStore } from "@application/stores/useDsmStore";

export interface WorkspaceTagInfo {
  tag: string;
  count: number;
}

/**
 * Custom hook aggregating all unique tags across the active workspace
 * from both General Notes and Daily Stand-up entries, sorted by frequency.
 */
export function useWorkspaceTags(): WorkspaceTagInfo[] {
  const { recentNotes } = useWorkspaceStore();
  const { dsmDoc } = useDsmStore();

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

    return Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [recentNotes, dsmDoc?.entries]);
}
