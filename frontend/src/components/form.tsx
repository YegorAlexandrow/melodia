import type { CSSProperties, ReactNode } from "react";

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--line)",
  borderRadius: 2,
  background: "var(--field)",
  color: "var(--ink)",
  fontFamily: "var(--font-body)",
  fontSize: 14,
  outline: "none",
};

export function Label({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--muted)",
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

export function Text({
  value,
  onChange,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...fieldStyle, fontFamily: mono ? "var(--font-mono)" : fieldStyle.fontFamily }}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={fieldStyle}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  small,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "blue" | "outline";
  disabled?: boolean;
  small?: boolean;
}) {
  const base: CSSProperties = {
    border: "none",
    borderRadius: 2,
    padding: small ? "5px 11px" : "10px 18px",
    fontWeight: variant === "outline" ? 400 : 700,
    fontSize: small ? 12 : 14,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.55 : 1,
    fontFamily: "var(--font-body)",
  };
  const styles: Record<string, CSSProperties> = {
    primary: { ...base, background: "var(--red)", color: "#f3ecdd" },
    blue: { ...base, background: "var(--blue)", color: "#f3ecdd" },
    outline: {
      ...base,
      background: "transparent",
      color: "var(--ink-soft)",
      border: "1px solid var(--line)",
    },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={styles[variant]}>
      {children}
    </button>
  );
}
