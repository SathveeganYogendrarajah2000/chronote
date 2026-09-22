import { convertFileSrc } from "@tauri-apps/api/core";
import { ipcBridge } from "./ipcBridge";

export interface ProcessedAsset {
  src: string;
  isImage: boolean;
  fileName: string;
  fileSize: number;
  mimeType: string;
  assetId: string;
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
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window && asset.absolutePath) {
    try {
      src = convertFileSrc(asset.absolutePath);
    } catch {
      src = asset.relativePath;
    }
  } else {
    try {
      src = URL.createObjectURL(file);
    } catch {
      src = asset.relativePath || asset.fileName;
    }
  }

  return {
    src,
    isImage,
    fileName: asset.fileName,
    fileSize: asset.fileSize,
    mimeType: asset.mimeType,
    assetId: asset.id,
  };
}
