import { create } from "zustand";
import type { TocHeadingItem } from "@domain/toc.utils";
import { useDsmStore } from "./useDsmStore";

export interface ActiveNoteCursorContext {
  source: "general" | "dsm";
  documentId: string;
  date?: string | undefined;
  title: string;
}

export type HeadingNavigator = (heading: TocHeadingItem) => boolean;

const editorNavigators = new Map<string, HeadingNavigator>();

interface TocState {
  activeContext: ActiveNoteCursorContext | null;
  activeHeadingId: string | null;
  isFloatingTocOpen: boolean;

  setActiveContext: (context: ActiveNoteCursorContext | null) => void;
  setActiveHeadingId: (headingId: string | null) => void;
  setFloatingTocOpen: (open: boolean) => void;
  toggleFloatingToc: () => void;
  registerEditorNavigator: (contextKey: string, navigator: HeadingNavigator) => () => void;
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

  registerEditorNavigator: (contextKey: string, navigator: HeadingNavigator) => {
    editorNavigators.set(contextKey, navigator);
    return () => {
      if (editorNavigators.get(contextKey) === navigator) {
        editorNavigators.delete(contextKey);
      }
    };
  },

  scrollToHeading: (heading: TocHeadingItem) => {
    const { activeContext } = get();
    set({ activeHeadingId: heading.id });

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
      // 1. Try editor navigator first (sets exact ProseMirror cursor selection)
      let navigated = false;
      if (activeContext) {
        const contextKey =
          activeContext.source === "dsm" && activeContext.date
            ? `dsm_${activeContext.date}`
            : `general_${activeContext.documentId}`;
        const nav = editorNavigators.get(contextKey);
        if (nav) {
          navigated = nav(heading);
        }
      }
      if (!navigated && editorNavigators.size > 0) {
        for (const nav of editorNavigators.values()) {
          if (nav(heading)) {
            navigated = true;
            break;
          }
        }
      }

      if (typeof document === "undefined") return;

      // 2. Find DOM element for scrolling and pulse animation
      let targetEl: HTMLElement | null = null;
      if (heading.id) {
        targetEl = document.querySelector(`[data-block-id="${heading.id}"]`) as HTMLElement;
      }

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

        // If editor navigator wasn't registered, place DOM selection at the heading
        if (!navigated) {
          try {
            const editorEl = targetEl.closest(".ProseMirror") as HTMLElement | null;
            editorEl?.focus();
            const sel = window.getSelection();
            if (sel) {
              const range = document.createRange();
              const textNode = targetEl.firstChild || targetEl;
              range.setStart(textNode, 0);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          } catch {}
        }

        // Highlight pulse animation
        targetEl.classList.remove("block-highlight-pulse");
        void targetEl.offsetWidth; // trigger reflow
        targetEl.classList.add("block-highlight-pulse");
        setTimeout(() => targetEl?.classList.remove("block-highlight-pulse"), 2600);
      }
    }, 60);
  },
}));
