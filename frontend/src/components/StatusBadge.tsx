import type { CopyStatus } from "../types";
import { STATUS_META } from "../lib/ui";

export function StatusBadge({ status, size = "md" }: { status: CopyStatus; size?: "sm" | "md" }) {
  const m = STATUS_META[status];
  const pad = size === "sm" ? "3px 8px" : "5px 11px";
  const fs = size === "sm" ? 10 : 11;
  return (
    <span
      style={{
        fontSize: fs,
        letterSpacing: ".05em",
        textTransform: "uppercase",
        fontWeight: 700,
        padding: pad,
        borderRadius: 2,
        background: m.bg,
        color: m.fg,
        whiteSpace: "nowrap",
      }}
    >
      {m.label}
    </span>
  );
}
