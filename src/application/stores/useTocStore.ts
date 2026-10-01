import { create } from "zustand";
import type { TocHeadingItem } from "@domain/toc.utils";
import { useDsmStore } from "./useDsmStore";

export interface ActiveNoteCursorContext {
  source: "general" | "dsm";
  documentId: string;
  date?: string | undefined;
  title: string;
}

interface TocState {
  activeContext: ActiveNoteCursorContext | null;
  activeHeadingId: string | null;
  isFloatingTocOpen: boolean;

  setActiveContext: (context: ActiveNoteCursorContext | null) => void;
  setActiveHeadingId: (headingId: string | null) => void;
  setFloatingTocOpen: (open: boolean) => void;
  toggleFloatingToc: () => void;
  scrollToHeading: (heading: TocHeadingItem) => void;
}

export const useTocStore = create<TocState>((set, get) => ({
  activeContext: null,
  activeHeadingId: null,
  isFloatingTocOpen: false,

  setActiveContext: (activeContext) => set({ activeContext }),
  setActiveHeadingId: (activeHeadingId) => set({ activeHeadingId }),
  setFloatingTocOpen: (isFloatingTocOpen) => set({ isFloatingTocOpen }),
  toggleFloatingToc: () => set((state) => ({ isFloatingTocOpen: !state.isFloatingTocOpen })),

  scrollToHeading: (heading: TocHeadingItem) => {
    const { activeContext } = get();
    set({ activeHeadingId: heading.id });

    if (typeof document === "undefined") return;

    // If target is in DSM, make sure the date entry is expanded
    if (activeContext?.source === "dsm" && activeContext.date) {
      const dsmStore = useDsmStore.getState();
      const entry = dsmStore.dsmDoc?.entries.find((e) => e.date === activeContext.date);
      if (entry && entry.collapsed) {
        dsmStore.toggleEntryCollapse(entry.id);
      }
    }

    // Delay slightly to let any DOM changes (like expanding) resolve
    setTimeout(() => {
      let targetEl: HTMLElement | null = null;

      // 1. Try finding by data-block-id
      if (heading.id) {
        targetEl = document.querySelector(`[data-block-id="${heading.id}"]`) as HTMLElement;
      }

      // 2. Fallback: search headings inside the active editor/view by matching text
      if (!targetEl) {
        const headings = document.querySelectorAll(
          activeContext?.source === "dsm" && activeContext.date
            ? `#dsm-entry-${activeContext.date} h1, #dsm-entry-${activeContext.date} h2, #dsm-entry-${activeContext.date} h3`
            : ".note-canvas-container h1, .note-canvas-container h2, .note-canvas-container h3"
        );

        for (const h of Array.from(headings)) {
          if (h.textContent?.trim() === heading.text.trim()) {
            targetEl = h as HTMLElement;
            break;
          }
        }
      }

      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });

        // Highlight pulse animation
        targetEl.classList.remove("block-highlight-pulse");
        void targetEl.offsetWidth; // trigger reflow
        targetEl.classList.add("block-highlight-pulse");
        setTimeout(() => targetEl?.classList.remove("block-highlight-pulse"), 2600);
      }
    }, 60);
  },
}));
