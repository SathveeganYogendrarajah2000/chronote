import type { IpcBridge, AppInfo } from "./ipcBridge";

export class MockIpcBridge implements IpcBridge {
  async getAppInfo(): Promise<AppInfo> {
    return {
      name: "Chronote (Test Environment)",
      version: "0.1.0-test",
      description: "Mock IPC Bridge for testing",
    };
  }

  async ping(): Promise<string> {
    return "pong";
  }
}

export const mockIpcBridge = new MockIpcBridge();
