import { useState, type ReactNode } from "react";

interface Props {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

// Секционный заголовок-аккордеон карточки (▾ открыт / ▸ свёрнут).
export function Accordion({ title, hint, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section style={{ marginBottom: 22 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "transparent",
          border: "none",
          borderBottom: open ? "1.5px solid var(--ink)" : "1px solid var(--line)",
          padding: "0 0 8px",
          cursor: "pointer",
          textAlign: "left",
          color: "var(--ink)",
        }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22 }}>
          {title}
        </span>
        {hint && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--faint)" }}>
            {hint}
          </span>
        )}
        <span style={{ marginLeft: "auto", color: "var(--muted)" }}>{open ? "▾" : "▸"}</span>
      </button>
      {open && <div style={{ paddingTop: 14 }}>{children}</div>}
    </section>
  );
}
