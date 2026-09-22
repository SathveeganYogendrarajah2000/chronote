import { convertFileSrc } from "@tauri-apps/api/core";
import { ipcBridge } from "./ipcBridge";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";

export interface ProcessedAsset {
  src: string;
  filePath: string;
  isImage: boolean;
  fileName: string;
  fileSize: number;
  mimeType: string;
  assetId: string;
}

/**
 * Resolves any local filesystem path or workspace relative path to a
 * webview-loadable Tauri asset URL.
 */
export function toAssetUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return "";

  // Already a full web/asset scheme
  if (
    pathOrUrl.startsWith("data:") ||
    pathOrUrl.startsWith("blob:") ||
    pathOrUrl.startsWith("http://asset.localhost") ||
    pathOrUrl.startsWith("https://asset.localhost") ||
    pathOrUrl.startsWith("asset://")
  ) {
    return pathOrUrl;
  }

  // External web URL
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  let absPath = pathOrUrl;
  const workspacePath = useWorkspaceStore.getState().workspace?.path;

  // Relative path within workspace (e.g. "assets/images/...")
  if (
    !pathOrUrl.includes(":") &&
    !pathOrUrl.startsWith("/") &&
    !pathOrUrl.startsWith("\\") &&
    workspacePath
  ) {
    const root = workspacePath.replace(/\\/g, "/").replace(/\/$/, "");
    const rel = pathOrUrl.replace(/\\/g, "/").replace(/^\//, "");
    absPath = `${root}/${rel}`;
  }

  const cleanAbsPath = absPath.replace(/\\/g, "/");
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    try {
      return convertFileSrc(cleanAbsPath);
    } catch {
      return pathOrUrl;
    }
  }

  return pathOrUrl;
}

/**
 * Saves a File / Blob to the active workspace asset folder and returns
 * the resolved webview asset URL and metadata for Tiptap nodes.
 */
export async function processFileAsset(file: File): Promise<ProcessedAsset> {
  const isImage =
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file.name);

  const buffer = new Uint8Array(await file.arrayBuffer());
  const asset = await ipcBridge.saveAssetBinary(
    isImage ? "image" : "file",
    file.name,
    buffer
  );

  let src = "";
  const rawPath = asset.absolutePath || asset.relativePath;
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window && rawPath) {
    src = toAssetUrl(rawPath);
  } else {
    try {
      src = URL.createObjectURL(file);
    } catch {
      src = asset.relativePath || asset.fileName;
    }
  }

  return {
    src,
    filePath: asset.absolutePath || asset.relativePath,
    isImage,
    fileName: asset.fileName,
    fileSize: asset.fileSize,
    mimeType: asset.mimeType,
    assetId: asset.id,
  };
}
