import { Component, type ErrorInfo, type ReactNode } from "react";
import { useWorkspaceStore } from "@application/stores/useWorkspaceStore";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Chronote ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleSwitchWorkspace = (): void => {
    this.setState({ hasError: false, error: null });
    useWorkspaceStore.getState().setWorkspaceModalOpen(true);
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            width: "100vw",
            backgroundColor: "var(--bg-app)",
            color: "var(--text-primary)",
            padding: "var(--space-6)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              maxWidth: 520,
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-6)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "var(--space-3)" }}>⚠️</div>
            <h2 style={{ fontSize: "var(--font-size-lg)", marginBottom: "var(--space-2)" }}>
              Something went wrong loading this view
            </h2>
            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--text-secondary)",
                marginBottom: "var(--space-4)",
              }}
            >
              An unexpected render issue occurred. Your files and workspace data are completely safe
              on disk.
            </p>
            {this.state.error && (
              <pre
                style={{
                  textAlign: "left",
                  fontSize: "11px",
                  backgroundColor: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "var(--space-3)",
                  marginBottom: "var(--space-4)",
                  overflowX: "auto",
                  color: "#ef4444",
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center" }}>
              <button type="button" className="btn-primary" onClick={this.handleReload}>
                Reload Application
              </button>
              <button type="button" className="btn-secondary" onClick={this.handleSwitchWorkspace}>
                Switch Workspace
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
