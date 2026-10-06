import type {
  CloudSyncConfig,
  SyncExecutionResult,
  SyncFileItem,
} from "../cloudSync.types";
import type { CloudStorageAdapter } from "./cloudStorageAdapter";
import { GoogleDriveAdapter } from "./googleDriveAdapter";
import { OneDriveAdapter } from "./oneDriveAdapter";
import { MockCloudAdapter } from "./mockCloudAdapter";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";
import type { GeneralNote } from "../note.types";
import type { DsmDocument } from "../dsm.types";
import type { CoursesDocument } from "../courses.types";

export function createCloudAdapter(config: CloudSyncConfig): CloudStorageAdapter {
  switch (config.provider) {
    case "google_drive":
      return new GoogleDriveAdapter();
    case "onedrive":
      return new OneDriveAdapter();
    case "mock":
    default:
      return new MockCloudAdapter();
  }
}

export interface SyncEngineContext {
  adapter: CloudStorageAdapter;
  config: CloudSyncConfig;
  targetFolderId: string;
}

/**
 * Executes a full bi-directional sync pass between the local Chronote workspace
 * and the user's connected cloud storage provider (Google Drive / OneDrive).
 */
export async function executeCloudSync(
  config: CloudSyncConfig,
  customAdapter?: CloudStorageAdapter
): Promise<SyncExecutionResult> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const items: SyncFileItem[] = [];
  let filesUploaded = 0;
  let filesDownloaded = 0;
  let conflictsFound = 0;

  if (!config.accessToken) {
    throw new Error("No access token provided for cloud synchronization");
  }

  const adapter = customAdapter || createCloudAdapter(config);

  // 1. Locate or create target workspace folder in cloud drive
  let targetFolderId = config.targetFolderId;
  if (!targetFolderId) {
    targetFolderId = await adapter.getOrCreateFolder(
      config.targetFolderPath || "Chronote",
      config.accessToken
    );
  }

  // 2. Fetch list of remote files
  const remoteFiles = await adapter.listFiles(targetFolderId, config.accessToken);
  const remoteFileMap = new Map(remoteFiles.map((f) => [f.name, f]));

  // 3. Collect local documents
  // 3a. General notes
  const localNotesMeta = await ipcBridge.listGeneralNotes();
  for (const meta of localNotesMeta) {
    const fileName = `${meta.id}.json`;
    const remote = remoteFileMap.get(fileName);

    const localItem: SyncFileItem = {
      id: meta.id,
      path: `notes/${fileName}`,
      name: meta.title,
      documentType: "general",
      localModifiedTime: meta.updatedAt,
      remoteModifiedTime: remote?.modifiedTime,
      remoteFileId: remote?.id,
      status: "synced",
    };

    if (!remote) {
      // Not yet on cloud -> upload
      try {
        const fullNote = await ipcBridge.readGeneralNote(meta.id);
        const uploaded = await adapter.uploadFile(
          targetFolderId,
          fileName,
          JSON.stringify(fullNote, null, 2),
          config.accessToken
        );
        localItem.status = "synced";
        localItem.remoteFileId = uploaded.id;
        localItem.remoteModifiedTime = uploaded.modifiedTime;
        filesUploaded++;
      } catch (err: any) {
        localItem.status = "error";
        localItem.detail = err?.message || String(err);
        errors.push(`Failed to upload ${fileName}: ${localItem.detail}`);
      }
    } else {
      // Exists both locally and remotely -> compare timestamps
      const localTime = new Date(meta.updatedAt).getTime();
      const remoteTime = new Date(remote.modifiedTime).getTime();

      if (Math.abs(localTime - remoteTime) < 2000) {
        // Within 2 seconds -> in sync
        localItem.status = "synced";
      } else if (localTime > remoteTime) {
        // Local is newer -> upload update
        try {
          const fullNote = await ipcBridge.readGeneralNote(meta.id);
          const uploaded = await adapter.uploadFile(
            targetFolderId,
            fileName,
            JSON.stringify(fullNote, null, 2),
            config.accessToken,
            remote.id
          );
          localItem.status = "synced";
          localItem.remoteModifiedTime = uploaded.modifiedTime;
          filesUploaded++;
        } catch (err: any) {
          localItem.status = "error";
          localItem.detail = err?.message || String(err);
          errors.push(`Failed to update ${fileName} in cloud: ${localItem.detail}`);
        }
      } else {
        // Remote is newer -> download
        try {
          const remoteContent = await adapter.downloadFile(remote.id, config.accessToken);
          const remoteNote: GeneralNote = JSON.parse(remoteContent);
          await ipcBridge.saveGeneralNote(remoteNote);
          localItem.status = "synced";
          localItem.localModifiedTime = remoteNote.updatedAt;
          filesDownloaded++;
        } catch (err: any) {
          localItem.status = "error";
          localItem.detail = err?.message || String(err);
          errors.push(`Failed to download ${fileName}: ${localItem.detail}`);
        }
      }
      remoteFileMap.delete(fileName);
    }

    items.push(localItem);
  }

  // 3b. Sync DSM Document (notes/dsm.json)
  try {
    const localDsm = await ipcBridge.readDsmDocument();
    const dsmFileName = "dsm.json";
    const remoteDsmMeta = remoteFileMap.get(dsmFileName);

    const dsmItem: SyncFileItem = {
      id: "dsm_master",
      path: "notes/dsm.json",
      name: "Daily Stand-up Journal",
      documentType: "dsm",
      localModifiedTime: localDsm.updatedAt,
      remoteModifiedTime: remoteDsmMeta?.modifiedTime,
      remoteFileId: remoteDsmMeta?.id,
      status: "synced",
    };

    if (!remoteDsmMeta) {
      const uploaded = await adapter.uploadFile(
        targetFolderId,
        dsmFileName,
        JSON.stringify(localDsm, null, 2),
        config.accessToken
      );
      dsmItem.remoteFileId = uploaded.id;
      dsmItem.remoteModifiedTime = uploaded.modifiedTime;
      filesUploaded++;
    } else {
      const localTime = new Date(localDsm.updatedAt).getTime();
      const remoteTime = new Date(remoteDsmMeta.modifiedTime).getTime();

      if (Math.abs(localTime - remoteTime) < 2000) {
        dsmItem.status = "synced";
      } else if (localTime > remoteTime) {
        const uploaded = await adapter.uploadFile(
          targetFolderId,
          dsmFileName,
          JSON.stringify(localDsm, null, 2),
          config.accessToken,
          remoteDsmMeta.id
        );
        dsmItem.remoteModifiedTime = uploaded.modifiedTime;
        filesUploaded++;
      } else {
        const remoteContent = await adapter.downloadFile(remoteDsmMeta.id, config.accessToken);
        const remoteDsm: DsmDocument = JSON.parse(remoteContent);
        await ipcBridge.saveDsmDocument(remoteDsm);
        dsmItem.localModifiedTime = remoteDsm.updatedAt;
        filesDownloaded++;
      }
      remoteFileMap.delete(dsmFileName);
    }
    items.push(dsmItem);
  } catch (err: any) {
    errors.push(`Failed to sync DSM Journal: ${err?.message || String(err)}`);
  }

  // 3c. Sync Courses & Learning (notes/courses.json)
  try {
    const localCourses = await ipcBridge.readCoursesDocument();
    const coursesFileName = "courses.json";
    const remoteCoursesMeta = remoteFileMap.get(coursesFileName);

    const coursesItem: SyncFileItem = {
      id: "courses_master",
      path: "notes/courses.json",
      name: "Courses & Learning",
      documentType: "courses",
      localModifiedTime: localCourses.updatedAt,
      remoteModifiedTime: remoteCoursesMeta?.modifiedTime,
      remoteFileId: remoteCoursesMeta?.id,
      status: "synced",
    };

    if (!remoteCoursesMeta) {
      const uploaded = await adapter.uploadFile(
        targetFolderId,
        coursesFileName,
        JSON.stringify(localCourses, null, 2),
        config.accessToken
      );
      coursesItem.remoteFileId = uploaded.id;
      coursesItem.remoteModifiedTime = uploaded.modifiedTime;
      filesUploaded++;
    } else {
      const localTime = new Date(localCourses.updatedAt).getTime();
      const remoteTime = new Date(remoteCoursesMeta.modifiedTime).getTime();

      if (Math.abs(localTime - remoteTime) < 2000) {
        coursesItem.status = "synced";
      } else if (localTime > remoteTime) {
        const uploaded = await adapter.uploadFile(
          targetFolderId,
          coursesFileName,
          JSON.stringify(localCourses, null, 2),
          config.accessToken,
          remoteCoursesMeta.id
        );
        coursesItem.remoteModifiedTime = uploaded.modifiedTime;
        filesUploaded++;
      } else {
        const remoteContent = await adapter.downloadFile(remoteCoursesMeta.id, config.accessToken);
        const remoteCourses: CoursesDocument = JSON.parse(remoteContent);
        await ipcBridge.saveCoursesDocument(remoteCourses);
        coursesItem.localModifiedTime = remoteCourses.updatedAt;
        filesDownloaded++;
      }
      remoteFileMap.delete(coursesFileName);
    }
    items.push(coursesItem);
  } catch (err: any) {
    errors.push(`Failed to sync Courses Document: ${err?.message || String(err)}`);
  }

  // 4. Any remaining files in remoteFileMap exist only on cloud -> download to local
  for (const [remoteName, remoteMeta] of remoteFileMap.entries()) {
    if (!remoteName.endsWith(".json")) continue;

    try {
      const content = await adapter.downloadFile(remoteMeta.id, config.accessToken);
      const parsed = JSON.parse(content);

      if (remoteName.startsWith("not_")) {
        const note: GeneralNote = parsed;
        await ipcBridge.saveGeneralNote(note);
        filesDownloaded++;
        items.push({
          id: note.id,
          path: `notes/${remoteName}`,
          name: note.title,
          documentType: "general",
          localModifiedTime: note.updatedAt,
          remoteModifiedTime: remoteMeta.modifiedTime,
          remoteFileId: remoteMeta.id,
          status: "synced",
        });
      }
    } catch (err: any) {
      errors.push(`Failed to download new cloud note ${remoteName}: ${err?.message || String(err)}`);
    }
  }

  const completedAt = new Date().toISOString();
  return {
    success: errors.length === 0,
    startedAt,
    completedAt,
    filesUploaded,
    filesDownloaded,
    conflictsFound,
    errors,
    items,
  };
}
