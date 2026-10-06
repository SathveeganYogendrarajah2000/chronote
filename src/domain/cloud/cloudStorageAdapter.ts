import type { CloudAccountInfo } from "../cloudSync.types";

export interface RemoteFileMeta {
  id: string;
  name: string;
  modifiedTime: string; // ISO 8601 string
  size?: number;
  md5Checksum?: string;
}

export interface CloudStorageAdapter {
  providerName: string;

  /**
   * Validates the provided OAuth access token and returns account info.
   */
  testConnection(accessToken: string): Promise<CloudAccountInfo>;

  /**
   * Finds or creates the target synchronization folder in the user's cloud drive.
   */
  getOrCreateFolder(folderName: string, accessToken: string): Promise<string>;

  /**
   * Lists all files currently stored in the remote target folder.
   */
  listFiles(folderId: string, accessToken: string): Promise<RemoteFileMeta[]>;

  /**
   * Uploads file content to the remote folder.
   */
  uploadFile(
    folderId: string,
    fileName: string,
    content: string,
    accessToken: string,
    existingFileId?: string
  ): Promise<{ id: string; modifiedTime: string }>;

  /**
   * Downloads text content of a remote file.
   */
  downloadFile(fileId: string, accessToken: string): Promise<string>;
}
