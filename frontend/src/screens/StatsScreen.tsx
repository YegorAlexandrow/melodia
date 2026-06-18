import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { getStats, type Stats } from "../api/client";
import { formatEpoch } from "../lib/ui";

export function StatsScreen() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  if (!stats) return <div className="page">Загрузка статистики…</div>;

  const maxPlant = Math.max(1, ...stats.by_plant.map((p) => p.count));
  const maxGenre = Math.max(1, ...stats.by_genre.map((g) => g.count));

  return (
    <div className="page" style={{ maxWidth: 1080 }}>
      <div className="overline">Сводка</div>
      <h1>Статистика</h1>

      {/* стат-карточки */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, margin: "24px 0" }}>
        <StatCard value={stats.total} label="всего" color="var(--ink)" />
        <StatCard value={stats.owned} label="в коллекции" color="var(--green)" />
        <StatCard value={stats.with_audio} label="с оцифровкой" color="var(--blue)" />
        <StatCard value={stats.wanted} label="в розыске" color="var(--red)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
        <Bars title="По заводам" color="var(--blue)" items={stats.by_plant.map((p) => ({ label: p.name, count: p.count }))} max={maxPlant} />
        <Bars title="По жанрам" color="var(--gold)" items={stats.by_genre.map((g) => ({ label: g.genre, count: g.count }))} max={maxGenre} />
      </div>

      <div style={{ marginTop: 30 }}>
        <SectionTitle>Давно не слушал</SectionTitle>
        {stats.long_unplayed.length === 0 && (
          <div style={{ color: "var(--muted)", fontStyle: "italic" }}>Нет данных</div>
        )}
        {stats.long_unplayed.map((c) => (
          <div
            key={c.id}
            onClick={() => navigate(`/copy/${c.id}`)}
            className="list-row"
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderBottom: "1px solid var(--hair)",
              cursor: "pointer",
            }}
          >
            <span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600 }}>{c.title}</span>
              <span style={{ color: "var(--muted)", fontSize: 13 }}> · {c.artist}</span>
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--faint)" }}>
              {c.last_played_at ? formatEpoch(c.last_played_at) : "ни разу"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 2, padding: 16 }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 36, lineHeight: 1, color }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--muted)" }}>{label}</div>
    </div>
  );
}

function Bars({
  title,
  items,
  max,
  color,
}: {
  title: string;
  items: { label: string; count: number }[];
  max: number;
  color: string;
}) {
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      {items.length === 0 && <div style={{ color: "var(--muted)", fontStyle: "italic" }}>Нет данных</div>}
      {items.map((it) => (
        <div key={it.label} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
            <span style={{ color: "var(--ink)" }}>{it.label}</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{it.count}</span>
          </div>
          <div style={{ height: 9, background: "var(--field)", borderRadius: 1, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(it.count / max) * 100}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 22,
        color: "var(--ink)",
        borderBottom: "1.5px solid var(--ink)",
        paddingBottom: 8,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}
