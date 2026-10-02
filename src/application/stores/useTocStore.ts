import { create } from "zustand";
import type { TocHeadingItem } from "@domain/toc.utils";
import { useDsmStore } from "./useDsmStore";

export interface ActiveNoteCursorContext {
  source: "general" | "dsm" | "courses";
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
            : activeContext.source === "courses"
            ? `courses_${activeContext.documentId}`
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
      const containerSelector =
        activeContext?.source === "dsm" && activeContext.date
          ? `#dsm-entry-${activeContext.date}`
          : activeContext?.source === "courses"
          ? ".learning-canvas-container"
          : ".note-canvas-container";

      // 2a. Match by unique block ID if not a synthetic fallback ID
      if (heading.id && !heading.id.startsWith("heading-")) {
        const matches = document.querySelectorAll<HTMLElement>(
          `${containerSelector} [data-block-id="${heading.id}"]`
        );
        if (matches.length === 1) {
          targetEl = matches[0];
        }
      }

      // 2b. Match by heading index within the active container
      if (!targetEl) {
        const headingEls = Array.from(
          document.querySelectorAll<HTMLElement>(
            `${containerSelector} h1, ${containerSelector} h2, ${containerSelector} h3`
          )
        );

        if (
          heading.index !== undefined &&
          heading.index >= 0 &&
          heading.index < headingEls.length
        ) {
          targetEl = headingEls[heading.index];
        } else {
          // Fallback: match by text
          for (const h of headingEls) {
            if (h.textContent?.trim() === heading.text.trim()) {
              targetEl = h;
              break;
            }
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
