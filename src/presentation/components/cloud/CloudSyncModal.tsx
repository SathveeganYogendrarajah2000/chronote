import React, { useEffect, useState } from "react";
import { useCloudSyncStore } from "@application/stores/useCloudSyncStore";
import type { CloudProvider } from "@domain/cloudSync.types";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";

export const CloudSyncModal: React.FC = () => {
  const {
    config,
    isSyncModalOpen,
    setSyncModalOpen,
    isTestingConnection,
    isSyncing,
    errorMessage,
    lastSyncResult,
    loadConfig,
    updateConfig,
    testConnection,
    syncNow,
    clearError,
  } = useCloudSyncStore();

  const [provider, setProvider] = useState<CloudProvider>(config.provider || "google_drive");
  const [accessToken, setAccessToken] = useState(config.accessToken || "");
  const [folderPath, setFolderPath] = useState(config.targetFolderPath || "Chronote");
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (isSyncModalOpen) {
      void loadConfig();
    }
  }, [isSyncModalOpen, loadConfig]);

  useEffect(() => {
    setProvider(config.provider || "google_drive");
    setAccessToken(config.accessToken || "");
    setFolderPath(config.targetFolderPath || "Chronote");
  }, [config]);

  if (!isSyncModalOpen) return null;

  const handleTestConnect = async () => {
    clearError();
    try {
      await updateConfig({ provider, targetFolderPath: folderPath });
      await testConnection(accessToken);
    } catch {
      // Error handled in store
    }
  };

  const handleSyncNow = async () => {
    clearError();
    try {
      await syncNow();
    } catch {
      // Error handled in store
    }
  };

  return (
    <div
      className="cloud-sync-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSyncModalOpen(false);
      }}
    >
      <div className="cloud-sync-modal" role="dialog" aria-modal="true" aria-labelledby="cloud-title">
        <div className="cloud-modal-header">
          <div className="cloud-header-title">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ color: "#38bdf8" }}>
              <path d="M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383zm.653.757c-.57.491-.98 1.137-1.127 1.838a.5.5 0 0 1-.418.39c-1.39.227-2.514 1.408-2.514 2.991 0 1.636 1.341 2.96 2.781 2.96h8.906C13.987 12.278 15 11.16 15 9.773c0-1.306-.93-2.39-2.195-2.502a.5.5 0 0 1-.448-.362C12.016 4.606 10.198 3 8 3c-1.258 0-2.428.534-3.235 1.442a.5.5 0 0 1-.706-.343z" />
            </svg>
            <h2 id="cloud-title">Cloud Synchronization (Phase 3)</h2>
          </div>
          <button
            type="button"
            className="perf-modal-close"
            onClick={() => setSyncModalOpen(false)}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.752.752 0 0 1 0-1.06z" />
            </svg>
          </button>
        </div>

        <div className="cloud-modal-content">
          {/* Provider Selection */}
          <div className="cloud-form-group">
            <label className="cloud-form-label">Select Cloud Storage Provider</label>
            <div className="cloud-provider-grid">
              <div
                className={`cloud-provider-card ${provider === "google_drive" ? "selected" : ""}`}
                onClick={() => setProvider("google_drive")}
              >
                <div className="cloud-provider-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 15L6.3 21h13.12l3.43-6M22.85 15l-6.55-11.5H9.72l6.56 11.5" />
                  </svg>
                </div>
                <span className="cloud-provider-label">Google Drive</span>
              </div>

              <div
                className={`cloud-provider-card ${provider === "onedrive" ? "selected" : ""}`}
                onClick={() => setProvider("onedrive")}
              >
                <div className="cloud-provider-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                  </svg>
                </div>
                <span className="cloud-provider-label">Microsoft OneDrive</span>
              </div>

              <div
                className={`cloud-provider-card ${provider === "mock" ? "selected" : ""}`}
                onClick={() => setProvider("mock")}
              >
                <div className="cloud-provider-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </div>
                <span className="cloud-provider-label">Sandbox (Mock)</span>
              </div>
            </div>
          </div>

          {/* Account status or Token input */}
          {config.account ? (
            <div className="cloud-account-card">
              <div className="cloud-account-info">
                <div className="cloud-account-avatar">
                  {config.account.name ? config.account.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="cloud-account-details">
                  <span className="cloud-account-name">{config.account.name || "Connected User"}</span>
                  <span className="cloud-account-email">{config.account.email || "OAuth Account"}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: "11px", padding: "4px 8px" }}
                onClick={() => void updateConfig({ accessToken: "", account: undefined })}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="cloud-form-group">
              <div className="cloud-form-label">
                <span>OAuth 2.0 Access Token</span>
                <span
                  style={{ cursor: "pointer", color: "var(--accent-primary)" }}
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? "Hide" : "Show"}
                </span>
              </div>
              <input
                type={showToken ? "text" : "password"}
                className="cloud-form-input"
                placeholder={
                  provider === "mock"
                    ? "Enter any test string (e.g. 'sandbox_token')"
                    : "Paste user-provided OAuth access token..."
                }
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {provider === "mock"
                  ? "Sandbox mode simulates full file transfers without external network calls."
                  : "Token is saved purely on your machine in .chronote/cloud_sync.json."}
              </span>

              {/* Collapsible OAuth Guide */}
              <div style={{ marginTop: "6px" }}>
                <div
                  className="cloud-guide-toggle"
                  onClick={() => setShowGuide(!showGuide)}
                  role="button"
                  tabIndex={0}
                >
                  <span>💡 How to get an OAuth token for {provider === "google_drive" ? "Google Drive" : provider === "onedrive" ? "OneDrive" : "Sandbox"}?</span>
                  <span style={{ fontSize: "11px" }}>{showGuide ? "▲ Close" : "▼ 2-Min Guide"}</span>
                </div>

                {showGuide && (
                  <div className="cloud-guide-box" style={{ marginTop: "6px" }}>
                    {provider === "google_drive" && (
                      <>
                        <div className="cloud-guide-step">
                          <span className="cloud-guide-step-num">1</span>
                          <div className="cloud-guide-step-content">
                            Open Google OAuth 2.0 Playground:
                            <br />
                            <button
                              type="button"
                              className="cloud-guide-link-btn"
                              onClick={() => void ipcBridge.openExternalUrl("https://developers.google.com/oauthplayground/")}
                            >
                              ↗ Open Google OAuth Playground
                            </button>
                          </div>
                        </div>
                        <div className="cloud-guide-step">
                          <span className="cloud-guide-step-num">2</span>
                          <div className="cloud-guide-step-content">
                            In <strong>Step 1</strong>, select:
                            <br />
                            • <code className="cloud-guide-code">Drive API v3 &gt; drive.file</code>
                            <br />
                            • <code className="cloud-guide-code">Google OAuth2 API v2 &gt; userinfo.email &amp; profile</code>
                          </div>
                        </div>
                        <div className="cloud-guide-step">
                          <span className="cloud-guide-step-num">3</span>
                          <div className="cloud-guide-step-content">
                            Click <strong>Authorize APIs</strong>, sign in with your Google account, then click <strong>Exchange authorization code for tokens</strong>.
                          </div>
                        </div>
                        <div className="cloud-guide-step">
                          <span className="cloud-guide-step-num">4</span>
                          <div className="cloud-guide-step-content">
                            Copy the <strong>Access token</strong> (starts with <code className="cloud-guide-code">ya29...</code>) and paste it into the input above.
                          </div>
                        </div>
                      </>
                    )}

                    {provider === "onedrive" && (
                      <>
                        <div className="cloud-guide-step">
                          <span className="cloud-guide-step-num">1</span>
                          <div className="cloud-guide-step-content">
                            Open Microsoft Graph Explorer:
                            <br />
                            <button
                              type="button"
                              className="cloud-guide-link-btn"
                              onClick={() => void ipcBridge.openExternalUrl("https://developer.microsoft.com/en-us/graph/graph-explorer")}
                            >
                              ↗ Open Microsoft Graph Explorer
                            </button>
                          </div>
                        </div>
                        <div className="cloud-guide-step">
                          <span className="cloud-guide-step-num">2</span>
                          <div className="cloud-guide-step-content">
                            Sign in with your Microsoft account (top-right), then click the <strong>Consent to permissions</strong> tab.
                          </div>
                        </div>
                        <div className="cloud-guide-step">
                          <span className="cloud-guide-step-num">3</span>
                          <div className="cloud-guide-step-content">
                            Search and consent to:
                            <br />
                            • <code className="cloud-guide-code">Files.ReadWrite</code>
                            <br />
                            • <code className="cloud-guide-code">User.Read</code>
                          </div>
                        </div>
                        <div className="cloud-guide-step">
                          <span className="cloud-guide-step-num">4</span>
                          <div className="cloud-guide-step-content">
                            Click the <strong>Access token</strong> tab, copy the token (starts with <code className="cloud-guide-code">eyJ0...</code>), and paste it above.
                          </div>
                        </div>
                      </>
                    )}

                    {provider === "mock" && (
                      <div className="cloud-guide-step">
                        <span className="cloud-guide-step-num">✓</span>
                        <div className="cloud-guide-step-content">
                          Sandbox mode simulates full cloud sync in-memory with zero external network calls. Type any string (e.g. <code className="cloud-guide-code">sandbox_token</code>) and click Test Connection.
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                      📖 For CLI and custom GCP/Azure App registration guides, see <strong>general/CLOUD_SYNC_GUIDE.md</strong>.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Target Folder */}
          <div className="cloud-form-group">
            <label className="cloud-form-label">Remote Workspace Folder</label>
            <input
              type="text"
              className="cloud-form-input"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="Chronote"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                background: "rgba(248, 81, 73, 0.12)",
                border: "1px solid rgba(248, 81, 73, 0.4)",
                color: "#f85149",
                fontSize: "12px",
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Last Sync Summary */}
          {lastSyncResult && (
            <div className="cloud-sync-summary">
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                Last Sync Result ({new Date(lastSyncResult.completedAt).toLocaleTimeString()}):
              </div>
              <div className="cloud-summary-stats">
                <span className="cloud-stat-item">
                  Uploaded: <span className="cloud-stat-val">{lastSyncResult.filesUploaded}</span>
                </span>
                <span className="cloud-stat-item">
                  Downloaded: <span className="cloud-stat-val">{lastSyncResult.filesDownloaded}</span>
                </span>
                <span className="cloud-stat-item">
                  Conflicts: <span className="cloud-stat-val">{lastSyncResult.conflictsFound}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="cloud-modal-footer">
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            Local-first: zero telemetry or Chronote cloud servers.
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {!config.account && (
              <button
                type="button"
                className="btn-secondary"
                disabled={isTestingConnection || !accessToken}
                onClick={handleTestConnect}
              >
                {isTestingConnection ? "Connecting..." : "Connect & Verify"}
              </button>
            )}

            <button
              type="button"
              className="btn-primary"
              disabled={isSyncing || (!config.account && !accessToken)}
              onClick={handleSyncNow}
            >
              {isSyncing ? (
                <>
                  <svg className="spin-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1.5a6.5 6.5 0 1 0 6.5 6.5h-1.5A5 5 0 1 1 8 3v1.5L5 2l3-2.5V1.5z" />
                  </svg>
                  <span>Syncing...</span>
                </>
              ) : (
                "Sync Now"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
