import { invoke } from "@tauri-apps/api/core";

export interface AppInfo {
  name: string;
  version: string;
  description: string;
}

export interface IpcBridge {
  getAppInfo(): Promise<AppInfo>;
  ping(): Promise<string>;
}

export class TauriIpcBridge implements IpcBridge {
  async getAppInfo(): Promise<AppInfo> {
    try {
      return await invoke<AppInfo>("get_app_info");
    } catch (err) {
      console.error("Failed to invoke get_app_info:", err);
      return {
        name: "Chronote",
        version: "0.1.0",
        description: "Your work. Remembered. Lightweight local-first desktop notebook.",
      };
    }
  }

  async ping(): Promise<string> {
    try {
      return await invoke<string>("ping");
    } catch (err) {
      console.error("Failed to invoke ping:", err);
      return "pong (mock)";
    }
  }
}

export const ipcBridge = new TauriIpcBridge();
