import React, { useState } from "react";
import { getTodayIsoDate } from "@application/stores/useDsmStore";

interface DsmDatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
}

export const DsmDatePicker: React.FC<DsmDatePickerProps> = ({
  isOpen,
  onClose,
  onSelectDate,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoDate());

  if (!isOpen) return null;

  const handleQuickSelect = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    setSelectedDate(dateStr);
  };

  const handleJump = () => {
    if (selectedDate) {
      onSelectDate(selectedDate);
      onClose();
    }
  };

  return (
    <div
      className="dsm-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dsm-date-picker-dialog" role="dialog" aria-modal="true">
        <h3 className="dsm-picker-title">Jump to Date</h3>
        <p className="dsm-picker-desc">
          Navigate directly to any stand-up entry or create a new entry for that date.
        </p>

        <div className="dsm-quick-dates-row">
          <button
            type="button"
            className="dsm-quick-date-btn"
            onClick={() => handleQuickSelect(0)}
          >
            Today
          </button>
          <button
            type="button"
            className="dsm-quick-date-btn"
            onClick={() => handleQuickSelect(1)}
          >
            Yesterday
          </button>
          <button
            type="button"
            className="dsm-quick-date-btn"
            onClick={() => handleQuickSelect(2)}
          >
            2 Days Ago
          </button>
          <button
            type="button"
            className="dsm-quick-date-btn"
            onClick={() => handleQuickSelect(7)}
          >
            1 Week Ago
          </button>
        </div>

        <div className="dsm-picker-input-group">
          <label htmlFor="dsm-date-input" style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
            Calendar Date
          </label>
          <input
            id="dsm-date-input"
            type="date"
            className="dsm-date-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleJump();
              if (e.key === "Escape") onClose();
            }}
          />
        </div>

        <div className="dsm-picker-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleJump}>
            Jump to Date
          </button>
        </div>
      </div>
    </div>
  );
};
