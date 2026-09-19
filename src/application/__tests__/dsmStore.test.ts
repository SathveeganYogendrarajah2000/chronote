import { describe, it, expect, beforeEach } from "vitest";
import { useDsmStore, getTodayIsoDate } from "../stores/useDsmStore";
import { mockIpcBridge } from "@infrastructure/tauri/mockIpcBridge";
import { proseMirrorDocToText } from "@domain/dsm.utils";

describe("useDsmStore", () => {
  beforeEach(async () => {
    // Reset mock IPC state
    await mockIpcBridge.createWorkspace("C:/mock/path", "Mock Workspace");
    // Reset store state
    useDsmStore.setState({
      dsmDoc: null,
      isLoading: false,
      isSaving: false,
      isDirty: false,
      highlightedDate: null,
      searchFilter: "",
    });
  });

  it("loads DSM document and initializes today's entry if empty", async () => {
    const store = useDsmStore.getState();
    await store.loadDsm();

    const { dsmDoc, isLoading } = useDsmStore.getState();
    expect(isLoading).toBe(false);
    expect(dsmDoc).not.toBeNull();
    expect(dsmDoc?.entries.length).toBe(1);
    expect(dsmDoc?.entries[0]?.date).toBe(getTodayIsoDate());
  });

  it("enforces at most one entry per calendar date", async () => {
    const store = useDsmStore.getState();
    await store.loadDsm();

    const date = "2026-09-15";
    const entry1 = store.createOrGetEntry(date, ["api"], "First write");
    expect(entry1.date).toBe(date);

    const docAfterFirst = useDsmStore.getState().dsmDoc;
    const countBefore = docAfterFirst?.entries.filter((e) => e.date === date).length;
    expect(countBefore).toBe(1);

    // Call again with the exact same date
    const entry2 = store.createOrGetEntry(date, ["other"], "Second attempt");
    expect(entry2.id).toBe(entry1.id);

    const docAfterSecond = useDsmStore.getState().dsmDoc;
    const countAfter = docAfterSecond?.entries.filter((e) => e.date === date).length;
    expect(countAfter).toBe(1);
  });

  it("toggles entry collapse state", async () => {
    const store = useDsmStore.getState();
    await store.loadDsm();

    const entry = store.createOrGetEntry("2026-09-15");
    expect(entry.collapsed).toBe(false);

    store.toggleEntryCollapse(entry.id);
    let updated = useDsmStore.getState().dsmDoc?.entries.find((e) => e.id === entry.id);
    expect(updated?.collapsed).toBe(true);

    store.toggleEntryCollapse(entry.id);
    updated = useDsmStore.getState().dsmDoc?.entries.find((e) => e.id === entry.id);
    expect(updated?.collapsed).toBe(false);
  });

  it("sets all entries collapse state", async () => {
    const store = useDsmStore.getState();
    await store.loadDsm();
    store.createOrGetEntry("2026-09-14");
    store.createOrGetEntry("2026-09-15");

    store.setAllCollapse(true);
    let doc = useDsmStore.getState().dsmDoc;
    expect(doc?.entries.every((e) => e.collapsed)).toBe(true);

    store.setAllCollapse(false);
    doc = useDsmStore.getState().dsmDoc;
    expect(doc?.entries.every((e) => !e.collapsed)).toBe(true);
  });

  it("updates entry text and ProseMirror tree", async () => {
    const store = useDsmStore.getState();
    await store.loadDsm();
    const entry = store.createOrGetEntry("2026-09-15");

    store.updateEntryText(entry.id, "Investigating Kafka rebalance issue.\nCompleted fix.");
    const updated = useDsmStore.getState().dsmDoc?.entries.find((e) => e.id === entry.id);
    expect(updated).toBeDefined();
    expect(proseMirrorDocToText(updated!.content)).toBe(
      "Investigating Kafka rebalance issue.\nCompleted fix."
    );
    expect(useDsmStore.getState().isDirty).toBe(true);
  });

  it("updates entry structured ProseMirror content", async () => {
    const store = useDsmStore.getState();
    await store.loadDsm();
    const entry = store.createOrGetEntry("2026-09-15");

    const richDoc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "DSM Stand-up Tasks" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Resolved prod database lock." }],
        },
      ],
    };

    store.updateEntryContent(entry.id, richDoc);
    const updated = useDsmStore.getState().dsmDoc?.entries.find((e) => e.id === entry.id);
    expect(updated?.content).toEqual(richDoc);
    expect(useDsmStore.getState().isDirty).toBe(true);
  });

  it("adds and removes normalized tags", async () => {
    const store = useDsmStore.getState();
    await store.loadDsm();
    const entry = store.createOrGetEntry("2026-09-15");

    store.addEntryTag(entry.id, "#Kafka-Streams");
    let updated = useDsmStore.getState().dsmDoc?.entries.find((e) => e.id === entry.id);
    expect(updated?.tags).toContain("kafka-streams");

    // Adding duplicate tag does not duplicate
    store.addEntryTag(entry.id, "kafka-streams");
    updated = useDsmStore.getState().dsmDoc?.entries.find((e) => e.id === entry.id);
    expect(updated?.tags.filter((t) => t === "kafka-streams").length).toBe(1);

    // Remove tag
    store.removeEntryTag(entry.id, "kafka-streams");
    updated = useDsmStore.getState().dsmDoc?.entries.find((e) => e.id === entry.id);
    expect(updated?.tags).not.toContain("kafka-streams");
  });

  it("deletes an entry", async () => {
    const store = useDsmStore.getState();
    await store.loadDsm();
    const entry = store.createOrGetEntry("2026-09-15");
    expect(useDsmStore.getState().dsmDoc?.entries.some((e) => e.id === entry.id)).toBe(true);

    await store.deleteEntry(entry.id);
    expect(useDsmStore.getState().dsmDoc?.entries.some((e) => e.id === entry.id)).toBe(false);
  });

  it("jumps to a date, expands it if collapsed, and sets highlightedDate", async () => {
    const store = useDsmStore.getState();
    await store.loadDsm();
    const entry = store.createOrGetEntry("2026-09-14");
    store.toggleEntryCollapse(entry.id); // make collapsed

    const jumped = store.jumpToDate("2026-09-14");
    expect(jumped).toBeDefined();
    expect(jumped?.date).toBe("2026-09-14");

    const updated = useDsmStore.getState().dsmDoc?.entries.find((e) => e.id === entry.id);
    expect(updated?.collapsed).toBe(false);
    expect(useDsmStore.getState().highlightedDate).toBe("2026-09-14");
  });
});
