import { useTabsStore } from "./stores/useTabsStore";
import { useDsmStore } from "./stores/useDsmStore";
import { useWorkspaceStore } from "./stores/useWorkspaceStore";
import { useNotesStore } from "./stores/useNotesStore";
import { DSM_TAB_ID } from "@domain/tabs.types";

/**
 * Navigates to a target note or DSM date entry.
 * - If target begins with "dsm:", switches to DSM tab and jumps to date.
 * - If target matches an existing note ID or title, opens the note in a tab and loads it.
 * - If target does not match an existing note, creates a new note with that title and opens it.
 */
export async function navigateToNoteOrDsm(targetNoteId: string): Promise<void> {
  const trimmed = targetNoteId.trim();
  if (!trimmed) return;

  // DSM Stand-up entry navigation
  if (trimmed.startsWith("dsm:")) {
    const date = trimmed.replace("dsm:", "");
    useTabsStore.getState().switchTab(DSM_TAB_ID);
    useDsmStore.getState().jumpToDate(date);
    return;
  }

  const { recentNotes } = useWorkspaceStore.getState();
  const noteMeta = recentNotes.find(
    (n) => n.id === trimmed || n.title.toLowerCase() === trimmed.toLowerCase()
  );

  if (noteMeta) {
    useTabsStore.getState().openTab({
      id: `tab_${noteMeta.id}`,
      documentId: noteMeta.id,
      documentType: "general",
      title: noteMeta.title,
    });
    await useNotesStore.getState().loadNote(noteMeta.id);
  } else {
    // Note does not exist yet; create it with target title and open tab
    const newNote = await useNotesStore.getState().createNote({ title: trimmed });
    useTabsStore.getState().openTab({
      id: `tab_${newNote.id}`,
      documentId: newNote.id,
      documentType: "general",
      title: newNote.title,
    });
  }
}
