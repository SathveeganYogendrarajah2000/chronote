import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUiStore, DEFAULT_SIDEBAR_WIDTH, DEFAULT_RESOURCE_WIDTH } from "../stores/useUiStore";
import { useTocStore } from "../stores/useTocStore";
import type { TocHeadingItem } from "@domain/toc.utils";

describe("useUiStore - sidebar & resource resizing", () => {
  beforeEach(() => {
    useUiStore.getState().resetSidebarWidth();
    useUiStore.getState().resetResourcePaneWidth();
    useUiStore.getState().resetZoom();
  });

  it("updates sidebar width within clamped bounds", () => {
    const store = useUiStore.getState();
    expect(store.sidebarWidth).toBe(DEFAULT_SIDEBAR_WIDTH);

    store.setSidebarWidth(350);
    expect(useUiStore.getState().sidebarWidth).toBe(350);

    // Clamps below minimum (180)
    store.setSidebarWidth(100);
    expect(useUiStore.getState().sidebarWidth).toBe(180);

    // Clamps above maximum (600)
    store.setSidebarWidth(900);
    expect(useUiStore.getState().sidebarWidth).toBe(600);

    // Reset restores default
    store.resetSidebarWidth();
    expect(useUiStore.getState().sidebarWidth).toBe(DEFAULT_SIDEBAR_WIDTH);
  });

  it("updates resource pane width within clamped bounds", () => {
    const store = useUiStore.getState();
    expect(store.resourcePaneWidth).toBe(DEFAULT_RESOURCE_WIDTH);

    store.setResourcePaneWidth(400);
    expect(useUiStore.getState().resourcePaneWidth).toBe(400);

    // Clamps below minimum (200)
    store.setResourcePaneWidth(120);
    expect(useUiStore.getState().resourcePaneWidth).toBe(200);

    // Clamps above maximum (700)
    store.setResourcePaneWidth(1000);
    expect(useUiStore.getState().resourcePaneWidth).toBe(700);

    // Reset restores default
    store.resetResourcePaneWidth();
    expect(useUiStore.getState().resourcePaneWidth).toBe(DEFAULT_RESOURCE_WIDTH);
  });

  it("handles zoom level stepping and resets", () => {
    const store = useUiStore.getState();
    expect(store.zoomLevel).toBe(1.0);

    store.zoomIn();
    expect(useUiStore.getState().zoomLevel).toBeGreaterThan(1.0);

    store.resetZoom();
    expect(useUiStore.getState().zoomLevel).toBe(1.0);

    store.zoomOut();
    expect(useUiStore.getState().zoomLevel).toBeLessThan(1.0);
  });
});

describe("useTocStore - cursor navigation", () => {
  beforeEach(() => {
    useTocStore.getState().setActiveContext(null);
    useTocStore.getState().setActiveHeadingId(null);
  });

  it("manages active cursor context", () => {
    const store = useTocStore.getState();
    store.setActiveContext({
      source: "general",
      documentId: "note_abc",
      title: "Architecture Design",
    });

    expect(useTocStore.getState().activeContext).toEqual({
      source: "general",
      documentId: "note_abc",
      title: "Architecture Design",
    });
  });

  it("registers and invokes editor navigator on scrollToHeading", () => {
    const store = useTocStore.getState();
    store.setActiveContext({
      source: "general",
      documentId: "note_123",
      title: "My Note",
    });

    const mockNavigate = vi.fn().mockReturnValue(true);
    const unregister = store.registerEditorNavigator("general_note_123", mockNavigate);

    const heading: TocHeadingItem = {
      id: "blk_heading_1",
      level: 2,
      text: "Database Schema",
      index: 0,
    };

    store.scrollToHeading(heading);

    // Wait for setTimeout in scrollToHeading
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(mockNavigate).toHaveBeenCalledWith(heading);
        expect(useTocStore.getState().activeHeadingId).toBe("blk_heading_1");
        unregister();
        resolve();
      }, 100);
    });
  });
});
