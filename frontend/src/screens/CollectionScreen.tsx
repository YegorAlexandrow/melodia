import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listCopies, getFacets, ApiError, type Facets } from "../api/client";
import type { CopyListItem } from "../types";
import { Cover } from "../components/Cover";
import { StatusBadge } from "../components/StatusBadge";
import { ratingCompact } from "../lib/ui";

type View = "grid" | "list";

export function CollectionScreen() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CopyListItem[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [view, setView] = useState<View>("grid");
  const [genre, setGenre] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFacets().then(setFacets).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      listCopies({ genre: genre ?? undefined, q: q.trim() || undefined, sort: "year" })
        .then(setItems)
        .catch((e) => setError(e instanceof ApiError ? e.message : "Ошибка загрузки"))
        .finally(() => setLoading(false));
    }, 200); // лёгкий дебаунс поиска
    return () => clearTimeout(t);
  }, [genre, q]);

  const total = facets?.total ?? items.length;

  return (
    <div className="page">
      {/* шапка */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20 }}>
        <div>
          <div className="overline">Личное собрание · винил</div>
          <h1>Коллекция</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              borderBottom: "1.5px solid var(--ink)",
              padding: "8px 4px",
            }}
          >
            <span style={{ color: "var(--red)" }}>⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="поиск по названию…"
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 16,
                color: "var(--ink)",
                width: 200,
              }}
            />
          </div>
          <Segmented
            options={[
              { key: "grid", label: "▦ сетка" },
              { key: "list", label: "≣ список" },
            ]}
            value={view}
            onChange={(v) => setView(v as View)}
          />
        </div>
      </div>

      {/* чипы-фильтры + счётчик */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          borderBottom: "1px solid var(--line)",
          padding: "16px 0",
          margin: "18px 0 24px",
        }}
      >
        <Chip label="Все" active={genre === null} onClick={() => setGenre(null)} />
        {(facets?.genres ?? []).map((g) => (
          <Chip key={g} label={g} active={genre === g} onClick={() => setGenre(g)} />
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--faint)",
          }}
        >
          {items.length} из {total} · по году ↓
        </span>
      </div>

      {error && <div style={{ color: "var(--red)" }}>{error}</div>}

      {!loading && items.length === 0 ? (
        <EmptyState />
      ) : view === "grid" ? (
        <GridView items={items} onOpen={(id) => navigate(`/copy/${id}`)} />
      ) : (
        <ListView items={items} onOpen={(id) => navigate(`/copy/${id}`)} />
      )}
    </div>
  );
}

function GridView({ items, onOpen }: { items: CopyListItem[]; onOpen: (id: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "28px 26px" }}>
      {items.map((c) => (
        <button
          key={c.id}
          onClick={() => onOpen(c.id)}
          style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", textAlign: "left" }}
        >
          <Cover title={c.display_title} artist={c.display_artist} catalog={c.catalog_number} cover={c.cover} />
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 10, gap: 8 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>
              {c.display_title}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--faint)" }}>{c.year}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{c.display_artist}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 8 }}>
            <StatusBadge status={c.status} size="sm" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--gold)" }}>
              {ratingCompact(c.current_album_rating, c.current_sound_rating)}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--faint)", marginLeft: "auto" }}>
              {c.has_audio ? "♪ " : ""}
              {c.has_notes ? "✎" : ""}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function ListView({ items, onOpen }: { items: CopyListItem[]; onOpen: (id: string) => void }) {
  const cols = "44px 1.6fr 130px 110px 90px 130px";
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 2, overflow: "hidden", background: "var(--card)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          gap: 14,
          padding: "10px 16px",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--muted)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span />
        <span>Артист · Название</span>
        <span>Каталог №</span>
        <span>Завод</span>
        <span>Оценки</span>
        <span>Статус</span>
      </div>
      {items.map((c) => (
        <div
          key={c.id}
          onClick={() => onOpen(c.id)}
          className="list-row"
          style={{
            display: "grid",
            gridTemplateColumns: cols,
            gap: 14,
            alignItems: "center",
            padding: "11px 16px",
            borderBottom: "1px solid var(--hair)",
            cursor: "pointer",
          }}
        >
          <Cover title={c.display_title} artist={c.display_artist} cover={c.cover} size={44} />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--ink)", lineHeight: 1.1 }}>
              {c.display_title}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {c.display_artist} · {c.year}
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-soft)" }}>{c.catalog_number}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--faint)" }}>{c.plant_code ?? "—"}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)" }}>
            {ratingCompact(c.current_album_rating, c.current_sound_rating)}
          </span>
          <span style={{ justifySelf: "start" }}>
            <StatusBadge status={c.status} size="sm" />
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        border: "1.5px dashed var(--line)",
        borderRadius: 3,
        padding: 48,
        textAlign: "center",
        background: "var(--card)",
      }}
    >
      <div style={{ fontSize: 30, color: "var(--faint)" }}>▦</div>
      <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 20, color: "var(--muted)", marginTop: 8 }}>
        Коллекция пока пуста
      </div>
      <Link
        to="/add"
        style={{
          display: "inline-block",
          marginTop: 16,
          background: "var(--red)",
          color: "#f3ecdd",
          padding: "10px 18px",
          borderRadius: 2,
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        + Добавить пластинку
      </Link>
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

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 2, background: "var(--ink)", padding: 2, borderRadius: 2 }}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            style={{
              padding: "7px 13px",
              fontSize: 13,
              border: "none",
              cursor: "pointer",
              borderRadius: 1,
              background: active ? "var(--paper)" : "transparent",
              color: active ? "var(--ink)" : "var(--faint)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
