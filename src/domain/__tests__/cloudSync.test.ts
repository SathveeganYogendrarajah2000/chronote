import { describe, it, expect, beforeEach } from "vitest";
import { MockCloudAdapter } from "../cloud/mockCloudAdapter";
import { executeCloudSync, createCloudAdapter } from "../cloud/cloudSyncEngine";
import type { CloudSyncConfig } from "../cloudSync.types";
import { mockIpcBridge } from "@infrastructure/tauri/mockIpcBridge";
import type { GeneralNote } from "../note.types";
import type { DsmDocument } from "../dsm.types";
import type { CoursesDocument } from "../courses.types";

describe("Cloud Storage Adapters & Sync Engine", () => {
  describe("MockCloudAdapter", () => {
    let adapter: MockCloudAdapter;

    beforeEach(() => {
      adapter = new MockCloudAdapter();
    });

    it("connects successfully with valid access token", async () => {
      const account = await adapter.testConnection("valid_token_xyz");
      expect(account.email).toBe("engineer@chronote.local");
      expect(account.name).toContain("Sandbox");
      expect(account.quotaTotalBytes).toBeGreaterThan(0);
      expect(account.quotaUsedBytes).toBeGreaterThan(0);
    });

    it("rejects invalid or empty token", async () => {
      await expect(adapter.testConnection("")).rejects.toThrow("Invalid mock access token");
      await expect(adapter.testConnection("invalid")).rejects.toThrow("Invalid mock access token");
    });

    it("creates/locates root folder", async () => {
      const folderId = await adapter.getOrCreateFolder("Chronote", "mock_tok");
      expect(folderId).toBe("mock_folder_chronote_root");
    });

    it("uploads and downloads files accurately", async () => {
      const { id, modifiedTime } = await adapter.uploadFile(
        "folder_1",
        "notes/test.json",
        JSON.stringify({ title: "Hello Cloud" }),
        "mock_tok"
      );

      expect(id).toBeDefined();
      expect(modifiedTime).toBeDefined();

      const downloaded = await adapter.downloadFile(id, "mock_tok");
      const parsed = JSON.parse(downloaded);
      expect(parsed.title).toBe("Hello Cloud");
    });

    it("lists all stored remote files with metadata", async () => {
      await adapter.uploadFile("folder_1", "file_a.json", "content A", "mock_tok");
      await adapter.uploadFile("folder_1", "file_b.json", "content B longer", "mock_tok");

      const files = await adapter.listFiles("folder_1", "mock_tok");
      expect(files.length).toBe(2);
      expect(files.map((f) => f.name).sort()).toEqual(["file_a.json", "file_b.json"]);
      expect(files.find((f) => f.name === "file_b.json")?.size).toBe("content B longer".length);
    });

    it("updates existing file when existingFileId is provided", async () => {
      const first = await adapter.uploadFile("folder_1", "doc.json", "v1", "mock_tok");
      const second = await adapter.uploadFile("folder_1", "doc.json", "v2", "mock_tok", first.id);

      expect(second.id).toBe(first.id);
      const content = await adapter.downloadFile(first.id, "mock_tok");
      expect(content).toBe("v2");
    });

    it("throws error when downloading non-existent file", async () => {
      await expect(adapter.downloadFile("non_existent_id", "mock_tok")).rejects.toThrow(
        "not found"
      );
    });
  });

  describe("executeCloudSync Differential Engine", () => {
    let mockAdapter: MockCloudAdapter;
    const baseConfig: CloudSyncConfig = {
      provider: "mock",
      enabled: true,
      clientId: "test_client",
      accessToken: "valid_sandbox_token",
      targetFolderPath: "Chronote",
      autoSyncIntervalMinutes: 0,
    };

    beforeEach(() => {
      mockIpcBridge.reset();
      mockAdapter = new MockCloudAdapter();
    });

    it("throws error if accessToken is missing", async () => {
      await expect(
        executeCloudSync({ ...baseConfig, accessToken: "" }, mockAdapter)
      ).rejects.toThrow("No access token provided");
    });

    it("uploads local notes to empty remote drive", async () => {
      const noteA: GeneralNote = {
        id: "not_101",
        title: "Distributed Raft Consensus",
        tags: ["distributed-systems", "algorithms"],
        pinned: false,
        content: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Raft leader election..." }] }],
        },
        schemaVersion: 1,
        createdAt: "2026-10-01T10:00:00.000Z",
        updatedAt: "2026-10-01T10:00:00.000Z",
      };

      await mockIpcBridge.saveGeneralNote(noteA);

      const result = await executeCloudSync(baseConfig, mockAdapter);

      expect(result.success).toBe(true);
      expect(result.filesUploaded).toBeGreaterThanOrEqual(1);
      expect(result.conflictsFound).toBe(0);

      // Verify file is now on remote adapter
      const remoteFiles = await mockAdapter.listFiles("mock_folder_chronote_root", "tok");
      const remoteNote = remoteFiles.find((f) => f.name === "not_101.json");
      expect(remoteNote).toBeDefined();

      const downloadedContent = await mockAdapter.downloadFile(remoteNote!.id, "tok");
      const parsed = JSON.parse(downloadedContent);
      expect(parsed.title).toBe("Distributed Raft Consensus");
    });

    it("downloads newer remote file when local note is older", async () => {
      const noteLocal: GeneralNote = {
        id: "not_202",
        title: "Kafka Event Streaming (Local Old)",
        tags: ["kafka"],
        pinned: false,
        content: { type: "doc", content: [] },
        schemaVersion: 1,
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
      };
      await mockIpcBridge.saveGeneralNote(noteLocal);

      // Seed remote with future updatedAt (newer than local)
      const futureTime = new Date(Date.now() + 3600 * 1000).toISOString();
      const noteRemote: GeneralNote = {
        ...noteLocal,
        title: "Kafka Event Streaming (Remote New)",
        updatedAt: futureTime,
      };
      mockAdapter.seedRemoteFile(
        "not_202.json",
        JSON.stringify(noteRemote),
        futureTime
      );

      const result = await executeCloudSync(baseConfig, mockAdapter);

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBeGreaterThanOrEqual(1);

      // Verify local file updated
      const updatedLocal = await mockIpcBridge.readGeneralNote("not_202");
      expect(updatedLocal.title).toBe("Kafka Event Streaming (Remote New)");
    });

    it("syncs DSM journal bi-directionally", async () => {
      const dsmDoc: DsmDocument = {
        id: "dsm_master",
        title: "Daily Stand-up Master Journal",
        schemaVersion: 1,
        entries: [
          {
            id: "dsm_entry_1",
            date: "2026-10-06",
            tags: ["standup"],
            collapsed: false,
            content: { type: "doc", content: [] },
            createdAt: "2026-10-06T09:00:00.000Z",
            updatedAt: "2026-10-06T09:00:00.000Z",
          },
        ],
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-06T09:00:00.000Z",
      };
      await mockIpcBridge.saveDsmDocument(dsmDoc);

      const result = await executeCloudSync(baseConfig, mockAdapter);
      expect(result.success).toBe(true);

      const remoteFiles = await mockAdapter.listFiles("mock_folder_chronote_root", "tok");
      const dsmRemote = remoteFiles.find((f) => f.name === "dsm.json");
      expect(dsmRemote).toBeDefined();
    });

    it("syncs Courses and Topics curriculum bi-directionally", async () => {
      const coursesDoc: CoursesDocument = {
        id: "courses_master",
        title: "Courses & Learning Master",
        schemaVersion: 1,
        topics: [
          {
            id: "top_k8s",
            title: "Kubernetes Orchestration",
            parentId: null,
            description: "Pods, Services, Ingress",
            tags: ["k8s", "devops"],
            content: { type: "doc", content: [] },
            createdAt: "2026-10-01T00:00:00.000Z",
            updatedAt: "2026-10-01T00:00:00.000Z",
          },
        ],
        resources: [],
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      };
      await mockIpcBridge.saveCoursesDocument(coursesDoc);

      const result = await executeCloudSync(baseConfig, mockAdapter);
      expect(result.success).toBe(true);

      const remoteFiles = await mockAdapter.listFiles("mock_folder_chronote_root", "tok");
      const coursesRemote = remoteFiles.find((f) => f.name === "courses.json");
      expect(coursesRemote).toBeDefined();
    });
  });

  describe("createCloudAdapter Factory", () => {
    it("instantiates MockCloudAdapter when provider is mock", () => {
      const adapter = createCloudAdapter({
        provider: "mock",
        enabled: true,
        clientId: "",
        accessToken: "",
        targetFolderPath: "Chronote",
        autoSyncIntervalMinutes: 0,
      });
      expect(adapter.providerName).toContain("Mock");
    });

    it("instantiates GoogleDriveAdapter when provider is google_drive", () => {
      const adapter = createCloudAdapter({
        provider: "google_drive",
        enabled: true,
        clientId: "",
        accessToken: "",
        targetFolderPath: "Chronote",
        autoSyncIntervalMinutes: 0,
      });
      expect(adapter.providerName).toContain("Google");
    });

    it("instantiates OneDriveAdapter when provider is onedrive", () => {
      const adapter = createCloudAdapter({
        provider: "onedrive",
        enabled: true,
        clientId: "",
        accessToken: "",
        targetFolderPath: "Chronote",
        autoSyncIntervalMinutes: 0,
      });
      expect(adapter.providerName).toContain("OneDrive");
    });
  });
});
