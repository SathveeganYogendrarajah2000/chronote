import React, { useEffect, useState } from "react";
import { useUiStore } from "@application/stores/useUiStore";
import { performanceProfiler } from "@application/services/performanceProfiler";
import { ipcBridge } from "@infrastructure/tauri/ipcBridge";
import type { ProfilerReport } from "@application/services/performanceProfiler";
import type { PerformanceMetrics } from "@infrastructure/tauri/ipcBridge";

export const PerformanceModal: React.FC = () => {
  const { performanceModalOpen, setPerformanceModalOpen } = useUiStore();
  const [report, setReport] = useState<ProfilerReport | null>(null);
  const [nativeMetrics, setNativeMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!performanceModalOpen) return;

    const loadMetrics = async () => {
      setLoading(true);
      const rep = performanceProfiler.getReport();
      setReport(rep);

      try {
        const native = await ipcBridge.getPerformanceMetrics();
        setNativeMetrics(native);
      } catch (err) {
        console.error("Failed to load native performance metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    void loadMetrics();
  }, [performanceModalOpen]);

  useEffect(() => {
    if (!performanceModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setPerformanceModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [performanceModalOpen, setPerformanceModalOpen]);

  if (!performanceModalOpen) return null;

  const totalEstimatedRamMb =
    (nativeMetrics?.memoryRssMb || 15) + (report?.jsHeapUsedMb || 45);

  return (
    <div
      className="perf-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) setPerformanceModalOpen(false);
      }}
    >
      <div className="perf-modal" role="dialog" aria-modal="true" aria-labelledby="perf-title">
        <div className="perf-modal-header">
          <div className="perf-header-title-group">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" style={{ color: "#38bdf8" }}>
              <path d="M8 1a7 7 0 1 0 7 7A7.008 7.008 0 0 0 8 1zm0 13a6 6 0 1 1 6-6 6.006 6.006 0 0 1-6 6z" />
              <path d="M8 4a.5.5 0 0 1 .5.5v3.293l2.146 2.147a.5.5 0 0 1-.708.708l-2.5-2.5A.5.5 0 0 1 7.5 8V4.5A.5.5 0 0 1 8 4z" />
            </svg>
            <h2 id="perf-title">Performance & Architecture Diagnostics</h2>
            {report && (
              <span className={`perf-grade-badge ${report.overallGrade}`}>
                {report.overallGrade}
              </span>
            )}
          </div>
          <button
            type="button"
            className="perf-modal-close"
            onClick={() => setPerformanceModalOpen(false)}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
            </svg>
          </button>
        </div>

        <div className="perf-modal-content">
          {/* Summary Cards */}
          <div className="perf-grid-summary">
            <div className="perf-card">
              <span className="perf-card-label">Cold Startup Latency</span>
              <span className="perf-card-value">
                {report ? `${report.coldStartupLatencyMs} ms` : "..."}
              </span>
              <span className="perf-card-subtext">Budget: &lt; 800 ms</span>
            </div>

            <div className="perf-card">
              <span className="perf-card-label">Estimated Idle RAM</span>
              <span className="perf-card-value">
                {loading ? "..." : `~${Math.round(totalEstimatedRamMb)} MB`}
              </span>
              <span className="perf-card-subtext">Hard Ceiling: &lt; 130 MB</span>
            </div>

            <div className="perf-card">
              <span className="perf-card-label">SQLite Database</span>
              <span className="perf-card-value">
                {nativeMetrics ? `${nativeMetrics.totalDocuments} notes` : "..."}
              </span>
              <span className="perf-card-subtext">
                {nativeMetrics
                  ? `${nativeMetrics.totalBlocks} blocks (${(nativeMetrics.dbSizeBytes / 1024).toFixed(0)} KB)`
                  : "..."}
              </span>
            </div>
          </div>

          {/* Detailed Budgets Comparison Table */}
          <div className="perf-table-section">
            <h3>Measurable Performance Budgets (PERFORMANCE.md)</h3>
            <table className="perf-table">
              <thead>
                <tr>
                  <th>Performance Metric</th>
                  <th>Target</th>
                  <th>Hard Ceiling</th>
                  <th>Current Measurement</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {report?.budgets.map((b) => (
                  <tr key={b.name}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{b.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{b.metric}</div>
                    </td>
                    <td>{b.targetThreshold}</td>
                    <td>{b.hardCeiling}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {b.currentValue} {b.unit}
                    </td>
                    <td>
                      <span className={`perf-status-indicator ${b.status}`}>
                        <span className={`perf-status-dot ${b.status}`} />
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="perf-modal-footer">
          <span className="perf-footer-note">
            Zero external network calls or cloud telemetry. All metrics calculated entirely on-device.
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setPerformanceModalOpen(false)}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
