import React, { useState } from "react";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";
import { IconButton } from "../common/IconButton";

type TabMode = "open" | "create" | "recent";

export const WorkspaceModal: React.FC = () => {
  const {
    workspace,
    isWorkspaceModalOpen,
    isLoading,
    error,
    recentWorkspaces,
    setWorkspaceModalOpen,
    openWorkspace,
    createWorkspace,
    pickDirectory,
    setError,
  } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<TabMode>(
    recentWorkspaces.length > 0 && !workspace ? "recent" : "open"
  );
  const [openPath, setOpenPath] = useState("");
  const [createName, setCreateName] = useState("Engineering Notes");
  const [createPath, setCreatePath] = useState("");

  if (!isWorkspaceModalOpen) return null;

  const handlePickOpenDir = async () => {
    setError(null);
    const selected = await pickDirectory();
    if (selected) {
      setOpenPath(selected);
    }
  };

  const handlePickCreateDir = async () => {
    setError(null);
    const selected = await pickDirectory();
    if (selected) {
      setCreatePath(selected);
    }
  };

  const handleOpenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openPath.trim()) return;
    try {
      await openWorkspace(openPath.trim());
    } catch {
      // Error handled in store
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createPath.trim() || !createName.trim()) return;
    try {
      await createWorkspace(createPath.trim(), createName.trim());
    } catch {
      // Error handled in store
    }
  };

  const handleRecentClick = async (path: string) => {
    try {
      await openWorkspace(path);
    } catch {
      // Error handled in store
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-container">
        <div className="modal-header">
          <span className="modal-title">
            {workspace ? "Switch Workspace" : "Welcome to Chronote"}
          </span>
          {workspace && (
            <IconButton
              label="Close dialog"
              icon={
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z" />
                </svg>
              }
              onClick={() => setWorkspaceModalOpen(false)}
            />
          )}
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert-banner alert-danger">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="modal-tabs">
            {recentWorkspaces.length > 0 && (
              <button
                type="button"
                className={`modal-tab-btn ${activeTab === "recent" ? "active" : ""}`}
                onClick={() => {
                  setError(null);
                  setActiveTab("recent");
                }}
              >
                Recent
              </button>
            )}
            <button
              type="button"
              className={`modal-tab-btn ${activeTab === "open" ? "active" : ""}`}
              onClick={() => {
                setError(null);
                setActiveTab("open");
              }}
            >
              Open Existing
            </button>
            <button
              type="button"
              className={`modal-tab-btn ${activeTab === "create" ? "active" : ""}`}
              onClick={() => {
                setError(null);
                setActiveTab("create");
              }}
            >
              New Workspace
            </button>
          </div>

          {activeTab === "recent" && (
            <div className="recent-workspace-list">
              {recentWorkspaces.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className="recent-workspace-card"
                  onClick={() => handleRecentClick(item.path)}
                  disabled={isLoading}
                >
                  <span className="recent-workspace-name">{item.name}</span>
                  <span className="recent-workspace-path">{item.path}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === "open" && (
            <form onSubmit={handleOpenSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="workspace-open-path">
                  Workspace Folder Path
                </label>
                <div className="form-input-row">
                  <input
                    id="workspace-open-path"
                    type="text"
                    className="form-input"
                    placeholder="e.g. C:\Users\dev\Notes"
                    value={openPath}
                    onChange={(e) => setOpenPath(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handlePickOpenDir}
                    disabled={isLoading}
                  >
                    Browse...
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading || !openPath.trim()}
              >
                {isLoading ? "Opening Workspace..." : "Open Workspace"}
              </button>
            </form>
          )}

          {activeTab === "create" && (
            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="workspace-create-name">
                  Workspace Name
                </label>
                <input
                  id="workspace-create-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Engineering Notes"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="workspace-create-path">
                  Directory Location
                </label>
                <div className="form-input-row">
                  <input
                    id="workspace-create-path"
                    type="text"
                    className="form-input"
                    placeholder="e.g. C:\Users\dev\ChronoteWorkspace"
                    value={createPath}
                    onChange={(e) => setCreatePath(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handlePickCreateDir}
                    disabled={isLoading}
                  >
                    Browse...
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading || !createPath.trim() || !createName.trim()}
              >
                {isLoading ? "Initializing Workspace..." : "Create & Initialize"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
