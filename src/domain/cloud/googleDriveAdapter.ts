import type { CloudStorageAdapter, RemoteFileMeta } from "./cloudStorageAdapter";
import type { CloudAccountInfo } from "../cloudSync.types";

export class GoogleDriveAdapter implements CloudStorageAdapter {
  readonly providerName = "Google Drive";

  async testConnection(accessToken: string): Promise<CloudAccountInfo> {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Drive authentication failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  }

  async getOrCreateFolder(folderName: string, accessToken: string): Promise<string> {
    const query = encodeURIComponent(
      `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`
    );
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name)`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to query Google Drive folder: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    // Create folder
    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create Google Drive folder: ${createRes.statusText}`);
    }

    const created = await createRes.json();
    return created.id;
  }

  async listFiles(folderId: string, accessToken: string): Promise<RemoteFileMeta[]> {
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size,md5Checksum)&pageSize=1000`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to list files in Google Drive folder: ${res.statusText}`);
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      modifiedTime: f.modifiedTime,
      size: f.size ? parseInt(f.size, 10) : undefined,
      md5Checksum: f.md5Checksum,
    }));
  }

  async uploadFile(
    folderId: string,
    fileName: string,
    content: string,
    accessToken: string,
    existingFileId?: string
  ): Promise<{ id: string; modifiedTime: string }> {
    if (existingFileId) {
      // Update existing file content
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
      const res = await fetch(updateUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: content,
      });

      if (!res.ok) {
        throw new Error(`Failed to update file in Google Drive: ${res.statusText}`);
      }

      const updated = await res.json();
      return {
        id: updated.id,
        modifiedTime: updated.modifiedTime || new Date().toISOString(),
      };
    } else {
      // Create new file with multipart upload
      const metadata = {
        name: fileName,
        parents: [folderId],
        mimeType: "application/json",
      };

      const boundary = "-------314159265358979323846";
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartBody =
        delimiter +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        "Content-Type: application/json\r\n\r\n" +
        content +
        closeDelimiter;

      const res = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: multipartBody,
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to upload file to Google Drive: ${res.statusText}`);
      }

      const created = await res.json();
      return {
        id: created.id,
        modifiedTime: created.modifiedTime || new Date().toISOString(),
      };
    }
  }

  async downloadFile(fileId: string, accessToken: string): Promise<string> {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to download file from Google Drive: ${res.statusText}`);
    }

    return await res.text();
  }
}
