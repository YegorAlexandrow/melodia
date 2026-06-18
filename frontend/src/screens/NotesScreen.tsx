import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { notesFeed, getFacets, type NoteFeedItem, type Facets } from "../api/client";
import { formatEpoch } from "../lib/ui";

type Filter = "all" | "pinned" | string;

export function NotesScreen() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteFeedItem[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    getFacets().then(setFacets).catch(() => {});
  }, []);

  useEffect(() => {
    const params =
      filter === "all" ? {} : filter === "pinned" ? { pinned: true } : { genre: filter };
    notesFeed(params).then(setNotes).catch(() => {});
  }, [filter]);

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div className="overline">Сквозная лента</div>
      <h1>Заметки</h1>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "18px 0 24px", borderBottom: "1px solid var(--line)", paddingBottom: 14 }}>
        <Chip label="Все" active={filter === "all"} onClick={() => setFilter("all")} />
        <Chip label="Закреплённые" active={filter === "pinned"} onClick={() => setFilter("pinned")} />
        {(facets?.genres ?? []).map((g) => (
          <Chip key={g} label={g} active={filter === g} onClick={() => setFilter(g)} />
        ))}
      </div>

      {notes.length === 0 && (
        <div style={{ fontStyle: "italic", color: "var(--muted)", fontFamily: "var(--font-display)", fontSize: 20 }}>
          Заметок пока нет
        </div>
      )}

      {notes.map((n) => (
        <div
          key={n.id}
          onClick={() => n.copy_id && navigate(`/copy/${n.copy_id}`)}
          className="list-row"
          style={{
            display: "flex",
            gap: 14,
            padding: "16px 12px",
            borderBottom: "1px solid var(--hair)",
            cursor: n.copy_id ? "pointer" : "default",
            borderLeft: `3px solid ${n.pinned ? "var(--gold)" : "var(--blue)"}`,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600 }}>{n.title || "Заметка"}</span>
              {n.pinned && <span style={{ fontSize: 11, color: "var(--gold)" }}>★</span>}
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--faint)" }}>
                {formatEpoch(n.created_at)}
              </span>
            </div>
            {(n.copy_artist || n.copy_title) && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--red)", marginTop: 3 }}>
                {n.copy_artist} — {n.copy_title}
              </div>
            )}
            <div style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5, marginTop: 6, whiteSpace: "pre-wrap" }}>
              {n.body}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "var(--font-display)",
        fontSize: 18,
        fontWeight: active ? 700 : 400,
        color: active ? "var(--red)" : "var(--muted)",
        borderBottom: active ? "2px solid var(--red)" : "2px solid transparent",
        paddingBottom: 2,
      }}
    >
      {label}
    </button>
  );
}
