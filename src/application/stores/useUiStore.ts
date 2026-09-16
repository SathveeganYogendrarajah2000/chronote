import { create } from "zustand";

export type ResourceTabType = "code" | "images" | "links" | "attachments" | "backlinks";
export type ThemeMode = "dark" | "light" | "system";

interface UiState {
  sidebarCollapsed: boolean;
  resourcePaneCollapsed: boolean;
  activeResourceTab: ResourceTabType;
  theme: ThemeMode;
  searchModalOpen: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleResourcePane: () => void;
  setResourcePaneCollapsed: (collapsed: boolean) => void;
  setActiveResourceTab: (tab: ResourceTabType) => void;
  setTheme: (theme: ThemeMode) => void;
  setSearchModalOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  resourcePaneCollapsed: false,
  activeResourceTab: "code",
  theme: "dark",
  searchModalOpen: false,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

  toggleResourcePane: () =>
    set((state) => ({ resourcePaneCollapsed: !state.resourcePaneCollapsed })),
  setResourcePaneCollapsed: (resourcePaneCollapsed) =>
    set({ resourcePaneCollapsed }),

  setActiveResourceTab: (activeResourceTab) => set({ activeResourceTab }),
  setTheme: (theme) => set({ theme }),
  setSearchModalOpen: (searchModalOpen) => set({ searchModalOpen }),
}));
