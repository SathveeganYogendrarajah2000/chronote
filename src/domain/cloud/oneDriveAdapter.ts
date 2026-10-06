import type { CloudStorageAdapter, RemoteFileMeta } from "./cloudStorageAdapter";
import type { CloudAccountInfo } from "../cloudSync.types";

export class OneDriveAdapter implements CloudStorageAdapter {
  readonly providerName = "Microsoft OneDrive";

  async testConnection(accessToken: string): Promise<CloudAccountInfo> {
    const res = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OneDrive authentication failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
    };
  }

  async getOrCreateFolder(folderName: string, accessToken: string): Promise<string> {
    const getUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(folderName)}`;

    const res = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const data = await res.json();
      return data.id;
    }

    // Create folder under root
    const createUrl = "https://graph.microsoft.com/v1.0/me/drive/root/children";
    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: folderName,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail",
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create OneDrive folder: ${createRes.statusText}`);
    }

    const created = await createRes.json();
    return created.id;
  }

  async listFiles(folderId: string, accessToken: string): Promise<RemoteFileMeta[]> {
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to list OneDrive folder items: ${res.statusText}`);
    }

    const data = await res.json();
    return (data.value || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      modifiedTime: item.lastModifiedDateTime,
      size: item.size,
    }));
  }

  async uploadFile(
    folderId: string,
    fileName: string,
    content: string,
    accessToken: string,
    _existingFileId?: string
  ): Promise<{ id: string; modifiedTime: string }> {
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${encodeURIComponent(fileName)}:/content`;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: content,
    });

    if (!res.ok) {
      throw new Error(`Failed to upload file to OneDrive: ${res.statusText}`);
    }

    const uploaded = await res.json();
    return {
      id: uploaded.id,
      modifiedTime: uploaded.lastModifiedDateTime || new Date().toISOString(),
    };
  }

  async downloadFile(fileId: string, accessToken: string): Promise<string> {
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to download file from OneDrive: ${res.statusText}`);
    }

    return await res.text();
  }
}
