import { create } from "zustand";
import type { ExportScope } from "@domain/export/export.types";

export type ResourceTabType = "outline" | "code" | "images" | "links" | "attachments" | "backlinks";
export type ThemeMode = "dark" | "light" | "system";

const ZOOM_LEVELS = [0.7, 0.8, 0.9, 1.0, 1.1, 1.25, 1.4, 1.5, 1.75, 2.0];

let hudTimer: ReturnType<typeof setTimeout> | null = null;

export function applyAppZoom(level: number) {
  if (typeof document !== "undefined") {
    (document.documentElement.style as any).zoom = String(level);
    document.documentElement.style.setProperty("--app-zoom", String(level));
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      import("@tauri-apps/api/webview")
        .then(({ getCurrentWebview }) => {
          getCurrentWebview().setZoom(level).catch(() => {});
        })
        .catch(() => {});
    }
  }
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem("chronote_zoom_level", String(level));
    } catch {}
  }
}

function getInitialZoom(): number {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem("chronote_zoom_level");
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val >= 0.5 && val <= 3.0) {
        applyAppZoom(val);
        return val;
      }
    }
  }
  return 1.0;
}

export const DEFAULT_SIDEBAR_WIDTH = 260;
export const MIN_SIDEBAR_WIDTH = 180;
export const MAX_SIDEBAR_WIDTH = 600;

export const DEFAULT_RESOURCE_WIDTH = 320;
export const MIN_RESOURCE_WIDTH = 200;
export const MAX_RESOURCE_WIDTH = 700;

function getInitialSidebarWidth(): number {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem("chronote_sidebar_width");
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val >= MIN_SIDEBAR_WIDTH && val <= MAX_SIDEBAR_WIDTH) {
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--sidebar-width", `${val}px`);
        }
        return val;
      }
    }
  }
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--sidebar-width", `${DEFAULT_SIDEBAR_WIDTH}px`);
  }
  return DEFAULT_SIDEBAR_WIDTH;
}

function getInitialResourceWidth(): number {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem("chronote_resource_width");
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val >= MIN_RESOURCE_WIDTH && val <= MAX_RESOURCE_WIDTH) {
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--resource-width", `${val}px`);
        }
        return val;
      }
    }
  }
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--resource-width", `${DEFAULT_RESOURCE_WIDTH}px`);
  }
  return DEFAULT_RESOURCE_WIDTH;
}

interface UiState {
  sidebarCollapsed: boolean;
  resourcePaneCollapsed: boolean;
  sidebarWidth: number;
  resourcePaneWidth: number;
  isResizingSidebar: boolean;
  activeResourceTab: ResourceTabType;
  theme: ThemeMode;
  searchModalOpen: boolean;
  searchModalMode: "find" | "replace";
  exportModalOpen: boolean;
  exportInitialScope?: ExportScope | undefined;
  performanceModalOpen: boolean;
  zoomLevel: number;
  zoomNotification: string | null;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  resetSidebarWidth: () => void;
  toggleResourcePane: () => void;
  setResourcePaneCollapsed: (collapsed: boolean) => void;
  setResourcePaneWidth: (width: number) => void;
  resetResourcePaneWidth: () => void;
  setIsResizingSidebar: (isResizing: boolean) => void;
  setActiveResourceTab: (tab: ResourceTabType) => void;
  openResourceOutline: () => void;
  setTheme: (theme: ThemeMode) => void;
  setSearchModalOpen: (open: boolean, mode?: "find" | "replace") => void;
  setSearchModalMode: (mode: "find" | "replace") => void;
  setExportModalOpen: (open: boolean, scope?: ExportScope | undefined) => void;
  setPerformanceModalOpen: (open: boolean) => void;
  setZoomLevel: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  sidebarCollapsed: false,
  resourcePaneCollapsed: false,
  sidebarWidth: getInitialSidebarWidth(),
  resourcePaneWidth: getInitialResourceWidth(),
  isResizingSidebar: false,
  activeResourceTab: "outline",
  theme: "dark",
  searchModalOpen: false,
  searchModalMode: "find",
  exportModalOpen: false,
  exportInitialScope: undefined,
  performanceModalOpen: false,
  zoomLevel: getInitialZoom(),
  zoomNotification: null,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

  setSidebarWidth: (rawWidth: number) => {
    const clamped = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, Math.round(rawWidth)));
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--sidebar-width", `${clamped}px`);
    }
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("chronote_sidebar_width", String(clamped));
      } catch {}
    }
    set({ sidebarWidth: clamped });
  },

  resetSidebarWidth: () => {
    get().setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  },

  toggleResourcePane: () =>
    set((state) => ({ resourcePaneCollapsed: !state.resourcePaneCollapsed })),
  setResourcePaneCollapsed: (resourcePaneCollapsed) =>
    set({ resourcePaneCollapsed }),

  setResourcePaneWidth: (rawWidth: number) => {
    const clamped = Math.max(MIN_RESOURCE_WIDTH, Math.min(MAX_RESOURCE_WIDTH, Math.round(rawWidth)));
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--resource-width", `${clamped}px`);
    }
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("chronote_resource_width", String(clamped));
      } catch {}
    }
    set({ resourcePaneWidth: clamped });
  },

  resetResourcePaneWidth: () => {
    get().setResourcePaneWidth(DEFAULT_RESOURCE_WIDTH);
  },

  setIsResizingSidebar: (isResizingSidebar: boolean) => set({ isResizingSidebar }),

  setActiveResourceTab: (activeResourceTab) => set({ activeResourceTab }),
  openResourceOutline: () => {
    set({ resourcePaneCollapsed: false, activeResourceTab: "outline" });
  },

  setTheme: (theme) => set({ theme }),
  setSearchModalOpen: (searchModalOpen, mode) =>
    set({
      searchModalOpen,
      ...(mode ? { searchModalMode: mode } : {}),
    }),
  setSearchModalMode: (searchModalMode) => set({ searchModalMode }),
  setExportModalOpen: (exportModalOpen, exportInitialScope) =>
    set({ exportModalOpen, exportInitialScope }),
  setPerformanceModalOpen: (performanceModalOpen) => set({ performanceModalOpen }),

  setZoomLevel: (rawLevel) => {
    const clamped = Math.max(0.7, Math.min(2.0, Math.round(rawLevel * 100) / 100));
    applyAppZoom(clamped);
    if (hudTimer) clearTimeout(hudTimer);
    hudTimer = setTimeout(() => {
      set({ zoomNotification: null });
    }, 1500);
    set({ zoomLevel: clamped, zoomNotification: `Zoom: ${Math.round(clamped * 100)}%` });
  },

  zoomIn: () => {
    const current = get().zoomLevel;
    const next = ZOOM_LEVELS.find((l) => l > current + 0.01) ?? ZOOM_LEVELS[ZOOM_LEVELS.length - 1]!;
    get().setZoomLevel(next);
  },

  zoomOut: () => {
    const current = get().zoomLevel;
    const prev = [...ZOOM_LEVELS].reverse().find((l) => l < current - 0.01) ?? ZOOM_LEVELS[0]!;
    get().setZoomLevel(prev);
  },

  resetZoom: () => {
    get().setZoomLevel(1.0);
  },
}));
