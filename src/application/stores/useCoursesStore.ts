import { create } from "zustand";
import type {
  CoursesDocument,
  LearningTopic,
  LearningResource,
  LearningPlatform,
  LearningStatus,
} from "@domain/courses.types";
import {
  createDefaultCoursesDocument,
  createLearningTopic,
  createLearningResource,
  getAllDescendantTopicIds,
} from "@domain/courses.utils";
import { normalizeTag, normalizeTagList } from "@domain/tagNormalizer";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";

let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export interface CoursesState {
  coursesDoc: CoursesDocument | null;
  selectedTopicId: string | null;
  expandedTopicIds: string[];
  searchQuery: string;
  selectedPlatform: LearningPlatform | "all";
  selectedStatus: LearningStatus | "all";
  selectedTags: string[];
  tagMatchMode: "and" | "or";

  // Modals & Editor states
  isTopicModalOpen: boolean;
  editingTopic: LearningTopic | null;
  parentTopicIdForNewTopic: string | null;

  isResourceModalOpen: boolean;
  editingResource: LearningResource | null;
  topicIdForNewResource: string | null;

  isNoteModalOpen: boolean;
  activeNoteResource: LearningResource | null;
  activeNoteTopic: LearningTopic | null;

  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;

  // Actions
  loadCourses: () => Promise<void>;
  saveCourses: () => Promise<void>;
  selectTopic: (topicId: string | null) => void;
  toggleTopicExpanded: (topicId: string) => void;
  setTopicExpanded: (topicId: string, expanded: boolean) => void;

  createTopic: (title: string, parentId?: string | null, description?: string, tags?: string[]) => LearningTopic;
  updateTopic: (id: string, updates: Partial<LearningTopic>) => void;
  deleteTopic: (id: string) => Promise<void>;

  createResource: (data: {
    topicId: string;
    title: string;
    platform?: LearningPlatform | undefined;
    url?: string | undefined;
    author?: string | undefined;
    status?: LearningStatus | undefined;
    progress?: number | undefined;
    completedItems?: number | undefined;
    totalItems?: number | undefined;
    rating?: number | undefined;
    tags?: string[] | undefined;
    notes?: string | undefined;
  }) => LearningResource;
  updateResource: (id: string, updates: Partial<LearningResource>) => void;
  deleteResource: (id: string) => Promise<void>;
  updateResourceProgress: (id: string, progress: number, completedItems?: number | undefined, totalItems?: number | undefined) => void;
  incrementResourceProgress: (id: string, delta?: number) => void;
  updateResourceNotes: (id: string, notes: string) => void;
  updateTopicNotes: (id: string, notes: string) => void;

  // Filters
  setSearchQuery: (query: string) => void;
  setSelectedPlatform: (platform: LearningPlatform | "all") => void;
  setSelectedStatus: (status: LearningStatus | "all") => void;
  toggleTagFilter: (tag: string) => void;
  clearTagFilters: () => void;
  setTagMatchMode: (mode: "and" | "or") => void;

  // Modals
  openCreateTopicModal: (parentId?: string | null) => void;
  openEditTopicModal: (topic: LearningTopic) => void;
  closeTopicModal: () => void;
  openCreateResourceModal: (topicId?: string) => void;
  openEditResourceModal: (resource: LearningResource) => void;
  closeResourceModal: () => void;
  openNoteModal: (target: { resource?: LearningResource; topic?: LearningTopic }) => void;
  closeNoteModal: () => void;
}

export const useCoursesStore = create<CoursesState>((set, get) => {
  const triggerDebouncedSave = () => {
    set({ isDirty: true });
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
    }
    saveDebounceTimer = setTimeout(() => {
      void get().saveCourses();
    }, 600);
  };

  return {
    coursesDoc: null,
    selectedTopicId: null,
    expandedTopicIds: [],
    searchQuery: "",
    selectedPlatform: "all",
    selectedStatus: "all",
    selectedTags: [],
    tagMatchMode: "and",

    isTopicModalOpen: false,
    editingTopic: null,
    parentTopicIdForNewTopic: null,

    isResourceModalOpen: false,
    editingResource: null,
    topicIdForNewResource: null,

    isNoteModalOpen: false,
    activeNoteResource: null,
    activeNoteTopic: null,

    isLoading: false,
    isSaving: false,
    isDirty: false,

    loadCourses: async () => {
      set({ isLoading: true });
      try {
        let doc = await ipcBridge.readCoursesDocument();
        if (!doc || !Array.isArray(doc.topics) || !Array.isArray(doc.resources)) {
          doc = createDefaultCoursesDocument();
          await ipcBridge.saveCoursesDocument(doc);
        }
        set({ coursesDoc: doc, isLoading: false, isDirty: false });
      } catch (err) {
        console.error("Failed to load courses document:", err);
        const fallback = createDefaultCoursesDocument();
        set({ coursesDoc: fallback, isLoading: false, isDirty: false });
      }
    },

    saveCourses: async () => {
      const { coursesDoc } = get();
      if (!coursesDoc) return;
      if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = null;
      }
      set({ isSaving: true });
      try {
        const toSave: CoursesDocument = {
          ...coursesDoc,
          updatedAt: new Date().toISOString(),
        };
        await ipcBridge.saveCoursesDocument(toSave);
        set({ coursesDoc: toSave, isSaving: false, isDirty: false });
      } catch (err) {
        console.error("Failed to save courses document:", err);
        set({ isSaving: false });
      }
    },

    selectTopic: (topicId: string | null) => {
      set({ selectedTopicId: topicId });
      // If a topic is selected, ensure it and its parents are expanded
      if (topicId) {
        const { coursesDoc, expandedTopicIds } = get();
        if (coursesDoc) {
          const idsToAdd = new Set(expandedTopicIds);
          let curr = coursesDoc.topics.find((t) => t.id === topicId);
          while (curr && curr.parentId) {
            idsToAdd.add(curr.parentId);
            curr = coursesDoc.topics.find((t) => t.id === curr?.parentId);
          }
          idsToAdd.add(topicId);
          set({ expandedTopicIds: Array.from(idsToAdd) });
        }
      }
    },

    toggleTopicExpanded: (topicId: string) => {
      set((state) => {
        const exists = state.expandedTopicIds.includes(topicId);
        return {
          expandedTopicIds: exists
            ? state.expandedTopicIds.filter((id) => id !== topicId)
            : [...state.expandedTopicIds, topicId],
        };
      });
    },

    setTopicExpanded: (topicId: string, expanded: boolean) => {
      set((state) => {
        const exists = state.expandedTopicIds.includes(topicId);
        if (expanded && !exists) {
          return { expandedTopicIds: [...state.expandedTopicIds, topicId] };
        } else if (!expanded && exists) {
          return { expandedTopicIds: state.expandedTopicIds.filter((id) => id !== topicId) };
        }
        return state;
      });
    },

    createTopic: (title: string, parentId: string | null = null, description: string = "", tags: string[] = []) => {
      const { coursesDoc } = get();
      const currentDoc = coursesDoc ?? createDefaultCoursesDocument();
      const newTopic = createLearningTopic(title, parentId, description, tags);

      const updatedTopics = [...currentDoc.topics, newTopic];
      const updatedDoc: CoursesDocument = {
        ...currentDoc,
        topics: updatedTopics,
        updatedAt: new Date().toISOString(),
      };

      // Auto-expand parent if exists
      const expanded = new Set(get().expandedTopicIds);
      if (parentId) expanded.add(parentId);
      expanded.add(newTopic.id);

      set({
        coursesDoc: updatedDoc,
        selectedTopicId: newTopic.id,
        expandedTopicIds: Array.from(expanded),
      });

      triggerDebouncedSave();
      return newTopic;
    },

    updateTopic: (id: string, updates: Partial<LearningTopic>) => {
      const { coursesDoc } = get();
      if (!coursesDoc) return;

      const now = new Date().toISOString();
      const updatedTopics = coursesDoc.topics.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            ...updates,
            tags: updates.tags ? normalizeTagList(updates.tags) : t.tags,
            updatedAt: now,
          };
        }
        return t;
      });

      set({
        coursesDoc: { ...coursesDoc, topics: updatedTopics, updatedAt: now },
      });
      triggerDebouncedSave();
    },

    deleteTopic: async (id: string) => {
      const { coursesDoc, selectedTopicId } = get();
      if (!coursesDoc) return;

      // Collect this topic and all nested subtopic IDs recursively
      const descendantIds = getAllDescendantTopicIds(coursesDoc.topics, id);
      const toDeleteIds = new Set([id, ...descendantIds]);

      const updatedTopics = coursesDoc.topics.filter((t) => !toDeleteIds.has(t.id));
      const updatedResources = coursesDoc.resources.filter((r) => !toDeleteIds.has(r.topicId));

      const updatedDoc: CoursesDocument = {
        ...coursesDoc,
        topics: updatedTopics,
        resources: updatedResources,
        updatedAt: new Date().toISOString(),
      };

      const newSelectedTopicId = selectedTopicId && toDeleteIds.has(selectedTopicId) ? null : selectedTopicId;

      set({
        coursesDoc: updatedDoc,
        selectedTopicId: newSelectedTopicId,
        expandedTopicIds: get().expandedTopicIds.filter((tId) => !toDeleteIds.has(tId)),
      });

      await get().saveCourses();
    },

    createResource: (data) => {
      const { coursesDoc } = get();
      const currentDoc = coursesDoc ?? createDefaultCoursesDocument();
      const newResource = createLearningResource(data);

      const updatedResources = [...currentDoc.resources, newResource];
      const updatedDoc: CoursesDocument = {
        ...currentDoc,
        resources: updatedResources,
        updatedAt: new Date().toISOString(),
      };

      set({ coursesDoc: updatedDoc });
      triggerDebouncedSave();
      return newResource;
    },

    updateResource: (id: string, updates: Partial<LearningResource>) => {
      const { coursesDoc } = get();
      if (!coursesDoc) return;

      const now = new Date().toISOString();
      const updatedResources = coursesDoc.resources.map((r) => {
        if (r.id === id) {
          const merged = { ...r, ...updates, updatedAt: now };
          if (updates.tags) merged.tags = normalizeTagList(updates.tags);
          if (updates.totalItems && updates.totalItems > 0 && updates.completedItems !== undefined) {
            merged.progress = Math.min(100, Math.round((updates.completedItems / updates.totalItems) * 100));
          }
          if (merged.progress >= 100 && merged.status !== "completed") {
            merged.status = "completed";
          }
          return merged;
        }
        return r;
      });

      set({
        coursesDoc: { ...coursesDoc, resources: updatedResources, updatedAt: now },
      });
      triggerDebouncedSave();
    },

    deleteResource: async (id: string) => {
      const { coursesDoc } = get();
      if (!coursesDoc) return;

      const updatedResources = coursesDoc.resources.filter((r) => r.id !== id);
      const updatedDoc: CoursesDocument = {
        ...coursesDoc,
        resources: updatedResources,
        updatedAt: new Date().toISOString(),
      };

      set({ coursesDoc: updatedDoc });
      await get().saveCourses();
    },

    updateResourceProgress: (id: string, progress: number, completedItems?: number | undefined, totalItems?: number | undefined) => {
      const cleanProgress = Math.max(0, Math.min(100, progress));
      const status: LearningStatus =
        cleanProgress >= 100 ? "completed" : cleanProgress > 0 ? "in_progress" : "not_started";

      get().updateResource(id, {
        progress: cleanProgress,
        completedItems,
        totalItems,
        status,
      });
    },

    incrementResourceProgress: (id: string, delta: number = 1) => {
      const { coursesDoc } = get();
      if (!coursesDoc) return;

      const res = coursesDoc.resources.find((r) => r.id === id);
      if (!res) return;

      if (res.totalItems && res.totalItems > 0) {
        const currentCompleted = res.completedItems ?? Math.round((res.progress / 100) * res.totalItems);
        const nextCompleted = Math.max(0, Math.min(res.totalItems, currentCompleted + delta));
        const nextProgress = Math.round((nextCompleted / res.totalItems) * 100);
        get().updateResourceProgress(id, nextProgress, nextCompleted, res.totalItems);
      } else {
        const nextProgress = Math.max(0, Math.min(100, res.progress + delta * 5));
        get().updateResourceProgress(id, nextProgress);
      }
    },

    updateResourceNotes: (id: string, notes: string) => {
      get().updateResource(id, { notes });
    },

    updateTopicNotes: (id: string, notes: string) => {
      get().updateTopic(id, { notes });
    },

    setSearchQuery: (query: string) => {
      set({ searchQuery: query });
    },

    setSelectedPlatform: (platform: LearningPlatform | "all") => {
      set({ selectedPlatform: platform });
    },

    setSelectedStatus: (status: LearningStatus | "all") => {
      set({ selectedStatus: status });
    },

    toggleTagFilter: (tag: string) => {
      const normalized = normalizeTag(tag);
      set((state) => {
        const exists = state.selectedTags.includes(normalized);
        return {
          selectedTags: exists
            ? state.selectedTags.filter((t) => t !== normalized)
            : [...state.selectedTags, normalized],
        };
      });
    },

    clearTagFilters: () => {
      set({ selectedTags: [] });
    },

    setTagMatchMode: (mode: "and" | "or") => {
      set({ tagMatchMode: mode });
    },

    openCreateTopicModal: (parentId: string | null = null) => {
      set({
        isTopicModalOpen: true,
        editingTopic: null,
        parentTopicIdForNewTopic: parentId,
      });
    },

    openEditTopicModal: (topic: LearningTopic) => {
      set({
        isTopicModalOpen: true,
        editingTopic: topic,
        parentTopicIdForNewTopic: topic.parentId,
      });
    },

    closeTopicModal: () => {
      set({
        isTopicModalOpen: false,
        editingTopic: null,
        parentTopicIdForNewTopic: null,
      });
    },

    openCreateResourceModal: (topicId?: string) => {
      const { selectedTopicId } = get();
      set({
        isResourceModalOpen: true,
        editingResource: null,
        topicIdForNewResource: topicId ?? selectedTopicId,
      });
    },

    openEditResourceModal: (resource: LearningResource) => {
      set({
        isResourceModalOpen: true,
        editingResource: resource,
        topicIdForNewResource: resource.topicId,
      });
    },

    closeResourceModal: () => {
      set({
        isResourceModalOpen: false,
        editingResource: null,
        topicIdForNewResource: null,
      });
    },

    openNoteModal: (target) => {
      set({
        isNoteModalOpen: true,
        activeNoteResource: target.resource ?? null,
        activeNoteTopic: target.topic ?? null,
      });
    },

    closeNoteModal: () => {
      set({
        isNoteModalOpen: false,
        activeNoteResource: null,
        activeNoteTopic: null,
      });
    },
  };
});
