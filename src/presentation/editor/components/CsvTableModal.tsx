import React, { useState, useMemo, useEffect } from "react";
import type { ProseMirrorNode } from "@domain/document.types";
import {
  parseDelimitedTextToTable,
  detectDelimiter,
} from "@domain/csvTableParser";

interface CsvTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTable: (tableNode: ProseMirrorNode) => void;
}

const PRESET_DELIMITERS: { label: string; value: string | "auto" }[] = [
  { label: "Auto-Detect", value: "auto" },
  { label: "Comma (,)", value: "," },
  { label: "Pipe (|)", value: "|" },
  { label: "Tab (\\t)", value: "\t" },
  { label: "Semicolon (;)", value: ";" },
  { label: "Custom", value: "custom" },
];

const SAMPLE_CSV = `Name, Role, Department, Status
Alice, Principal Architect, Platform, Active
Bob, Staff Engineer, Frontend, Active
Charlie, Security Lead, Infra, Review`;

const SAMPLE_PIPE = `| Service | Port | Protocol | Cluster |
| :--- | :---: | :---: | ---: |
| auth-service | 8081 | gRPC | prod-us-east |
| api-gateway | 443 | HTTPS | prod-global |
| telemetry-bus | 9092 | Kafka | prod-eu-west |`;

const SAMPLE_TSV = `Metric\tTarget\tCurrent\tUnit
Latency P99\t< 120\t84\tms
Availability\t99.99\t99.995\t%
Throughput\t50000\t62400\trps`;

export const CsvTableModal: React.FC<CsvTableModalProps> = ({
  isOpen,
  onClose,
  onInsertTable,
}) => {
  const [rawText, setRawText] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | "auto">("auto");
  const [customDelimiter, setCustomDelimiter] = useState("");
  const [hasHeaderRow, setHasHeaderRow] = useState(true);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setRawText("");
      setSelectedPreset("auto");
      setCustomDelimiter("");
      setHasHeaderRow(true);
    }
  }, [isOpen]);

  // Handle ESC and Ctrl+Enter keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleInsert();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const activeDelimiter = useMemo(() => {
    if (selectedPreset === "custom") {
      return customDelimiter || ",";
    }
    return selectedPreset;
  }, [selectedPreset, customDelimiter]);

  const parsedResult = useMemo(() => {
    if (!rawText.trim()) {
      return null;
    }
    return parseDelimitedTextToTable(rawText, {
      delimiter: activeDelimiter,
      hasHeaderRow,
    });
  }, [rawText, activeDelimiter, hasHeaderRow]);

  const detectedDisplay = useMemo(() => {
    if (selectedPreset !== "auto" && selectedPreset !== "custom") {
      return `Selected: "${selectedPreset === "\t" ? "\\t" : selectedPreset}"`;
    }
    if (selectedPreset === "custom") {
      return `Custom: "${customDelimiter}"`;
    }
    if (!rawText.trim()) return "Auto-Detect";
    const detected = detectDelimiter(rawText);
    const label =
      detected === "\t"
        ? "\\t (Tab)"
        : detected === ","
        ? ", (Comma)"
        : detected === "|"
        ? "| (Pipe)"
        : `"${detected}"`;
    return `Detected: ${label}`;
  }, [selectedPreset, customDelimiter, rawText]);

  const handleInsert = () => {
    if (!parsedResult || parsedResult.rowCount === 0) return;
    onInsertTable(parsedResult.proseMirrorTable);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="csv-modal-backdrop" onClick={onClose}>
      <div
        className="csv-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="csv-modal-header">
          <div className="csv-modal-title-wrapper">
            <span className="csv-modal-icon">📊</span>
            <div>
              <h2 id="csv-modal-title" className="csv-modal-title">
                Create Table from Delimited Text
              </h2>
              <p className="csv-modal-subtitle">
                Paste CSV, TSV, Markdown pipe tables, or any custom delimited data.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="csv-modal-close-btn"
            onClick={onClose}
            title="Close dialog (Esc)"
          >
            ✕
          </button>
        </div>

        <div className="csv-modal-body">
          {/* Quick presets & sample loaders */}
          <div className="csv-modal-toolbar">
            <div className="csv-delimiter-group">
              <span className="csv-toolbar-label">Delimiter:</span>
              <div className="csv-pill-buttons">
                {PRESET_DELIMITERS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className={`csv-pill-btn ${
                      selectedPreset === preset.value ? "is-active" : ""
                    }`}
                    onClick={() => setSelectedPreset(preset.value)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {selectedPreset === "custom" && (
                <input
                  type="text"
                  className="csv-custom-delimiter-input"
                  placeholder="e.g. :: or ~"
                  value={customDelimiter}
                  onChange={(e) => setCustomDelimiter(e.target.value)}
                  maxLength={10}
                  autoFocus
                />
              )}
            </div>

            <div className="csv-sample-group">
              <span className="csv-toolbar-label">Examples:</span>
              <button
                type="button"
                className="csv-sample-link"
                onClick={() => {
                  setRawText(SAMPLE_CSV);
                  setSelectedPreset(",");
                }}
              >
                CSV
              </button>
              <button
                type="button"
                className="csv-sample-link"
                onClick={() => {
                  setRawText(SAMPLE_PIPE);
                  setSelectedPreset("|");
                }}
              >
                Pipe Table
              </button>
              <button
                type="button"
                className="csv-sample-link"
                onClick={() => {
                  setRawText(SAMPLE_TSV);
                  setSelectedPreset("\t");
                }}
              >
                TSV
              </button>
            </div>
          </div>

          {/* Text Input Area */}
          <div className="csv-input-wrapper">
            <textarea
              className="csv-raw-textarea"
              placeholder={`Paste delimited text here...\n\nExample:\nName, Role, Status\nAlice, Lead, Active\nBob, Core, Active`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={7}
              spellCheck={false}
              autoFocus
            />
          </div>

          {/* Option Toggles & Summary Badges */}
          <div className="csv-options-row">
            <label className="csv-checkbox-label">
              <input
                type="checkbox"
                checked={hasHeaderRow}
                onChange={(e) => setHasHeaderRow(e.target.checked)}
              />
              <span>First row is header</span>
            </label>

            <div className="csv-status-badges">
              <span className="csv-badge csv-badge-delimiter">
                {detectedDisplay}
              </span>
              {parsedResult && parsedResult.rowCount > 0 && (
                <span className="csv-badge csv-badge-metrics">
                  {parsedResult.rowCount} {parsedResult.rowCount === 1 ? "row" : "rows"} ×{" "}
                  {parsedResult.columnCount} {parsedResult.columnCount === 1 ? "col" : "cols"}
                </span>
              )}
            </div>
          </div>

          {/* Live Preview Grid */}
          <div className="csv-preview-section">
            <div className="csv-preview-header">
              <span className="csv-preview-title">Table Preview</span>
              {parsedResult && parsedResult.rowCount > 0 && (
                <span className="csv-preview-hint">
                  Live preview of how the table will look in the editor
                </span>
              )}
            </div>

            {parsedResult && parsedResult.rowCount > 0 ? (
              <div className="csv-preview-table-container">
                <table className="csv-preview-table">
                  {parsedResult.headers && (
                    <thead>
                      <tr>
                        {parsedResult.headers.map((h, idx) => (
                          <th key={idx}>{h || <span className="csv-empty-cell">(empty)</span>}</th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {parsedResult.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx}>
                            {cell || <span className="csv-empty-cell">&nbsp;</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="csv-preview-empty">
                {rawText.trim()
                  ? "No valid tabular data could be extracted. Check delimiter settings."
                  : "Paste text or choose an example above to preview the generated table."}
              </div>
            )}
          </div>
        </div>

        <div className="csv-modal-footer">
          <div className="csv-modal-footer-hint">
            Press <kbd>Ctrl+Enter</kbd> to insert immediately
          </div>
          <div className="csv-modal-footer-actions">
            <button
              type="button"
              className="csv-modal-btn csv-modal-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="csv-modal-btn csv-modal-btn-submit"
              disabled={!parsedResult || parsedResult.rowCount === 0}
              onClick={handleInsert}
            >
              Insert Table
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
