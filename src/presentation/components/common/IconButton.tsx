import React from "react";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  active,
  className = "",
  style,
  ...props
}) => {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: "var(--radius-md)",
        color: active ? "var(--accent-primary)" : "var(--text-secondary)",
        backgroundColor: active ? "var(--bg-surface-active)" : "transparent",
        transition: "all var(--transition-fast)",
        ...style,
      }}
      className={className}
      {...props}
    >
      {icon}
    </button>
  );
};
