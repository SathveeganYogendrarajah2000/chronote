import type { CloudStorageAdapter, RemoteFileMeta } from "./cloudStorageAdapter";
import type { CloudAccountInfo } from "../cloudSync.types";

export class MockCloudAdapter implements CloudStorageAdapter {
  readonly providerName = "Mock Cloud Drive (Sandbox)";
  private remoteFiles = new Map<string, { id: string; name: string; content: string; modifiedTime: string }>();

  async testConnection(accessToken: string): Promise<CloudAccountInfo> {
    if (!accessToken || accessToken === "invalid") {
      throw new Error("Invalid mock access token provided");
    }
    return {
      email: "engineer@chronote.local",
      name: "Engineering Lead (Sandbox)",
      quotaTotalBytes: 15 * 1024 * 1024 * 1024,
      quotaUsedBytes: 250 * 1024 * 1024,
    };
  }

  async getOrCreateFolder(_folderName: string, _accessToken: string): Promise<string> {
    return "mock_folder_chronote_root";
  }

  async listFiles(_folderId: string, _accessToken: string): Promise<RemoteFileMeta[]> {
    return Array.from(this.remoteFiles.values()).map((f) => ({
      id: f.id,
      name: f.name,
      modifiedTime: f.modifiedTime,
      size: f.content.length,
    }));
  }

  async uploadFile(
    _folderId: string,
    fileName: string,
    content: string,
    _accessToken: string,
    existingFileId?: string
  ): Promise<{ id: string; modifiedTime: string }> {
    const id = existingFileId || `rem_${fileName.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const modifiedTime = new Date().toISOString();
    this.remoteFiles.set(id, { id, name: fileName, content, modifiedTime });
    return { id, modifiedTime };
  }

  async downloadFile(fileId: string, _accessToken: string): Promise<string> {
    const item = this.remoteFiles.get(fileId);
    if (!item) {
      throw new Error(`Remote file ${fileId} not found`);
    }
    return item.content;
  }

  // Helper for test setups
  seedRemoteFile(name: string, content: string, modifiedTime = new Date().toISOString()): string {
    const id = `rem_${name.replace(/[^a-zA-Z0-9]/g, "_")}`;
    this.remoteFiles.set(id, { id, name, content, modifiedTime });
    return id;
  }

  clear(): void {
    this.remoteFiles.clear();
  }
}
