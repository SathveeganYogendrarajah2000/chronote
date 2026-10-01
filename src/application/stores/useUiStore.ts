import { create } from "zustand";
import type { ExportScope } from "@domain/export/export.types";
import { useResourceStore } from "./useResourceStore";

export type ResourceTabType = "outline" | "code" | "images" | "links" | "attachments" | "backlinks";
export type ThemeMode = "dark" | "light" | "system";

const ZOOM_LEVELS = [0.7, 0.8, 0.9, 1.0, 1.1, 1.25, 1.4, 1.5, 1.75, 2.0];

let hudTimer: ReturnType<typeof setTimeout> | null = null;

export function applyAppZoom(level: number) {
  if (typeof document !== "undefined") {
    (document.documentElement.style as any).zoom = String(level);
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

interface UiState {
  sidebarCollapsed: boolean;
  resourcePaneCollapsed: boolean;
  activeResourceTab: ResourceTabType;
  theme: ThemeMode;
  searchModalOpen: boolean;
  exportModalOpen: boolean;
  exportInitialScope?: ExportScope | undefined;
  performanceModalOpen: boolean;
  zoomLevel: number;
  zoomNotification: string | null;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleResourcePane: () => void;
  setResourcePaneCollapsed: (collapsed: boolean) => void;
  setActiveResourceTab: (tab: ResourceTabType) => void;
  openResourceOutline: () => void;
  setTheme: (theme: ThemeMode) => void;
  setSearchModalOpen: (open: boolean) => void;
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
  activeResourceTab: "outline",
  theme: "dark",
  searchModalOpen: false,
  exportModalOpen: false,
  exportInitialScope: undefined,
  performanceModalOpen: false,
  zoomLevel: getInitialZoom(),
  zoomNotification: null,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

  toggleResourcePane: () =>
    set((state) => ({ resourcePaneCollapsed: !state.resourcePaneCollapsed })),
  setResourcePaneCollapsed: (resourcePaneCollapsed) =>
    set({ resourcePaneCollapsed }),

  setActiveResourceTab: (activeResourceTab) => set({ activeResourceTab }),
  openResourceOutline: () => {
    set({ resourcePaneCollapsed: false, activeResourceTab: "outline" });
    useResourceStore.getState().setActiveTab("outline");
  },

  setTheme: (theme) => set({ theme }),
  setSearchModalOpen: (searchModalOpen) => set({ searchModalOpen }),
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
