import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCopy, updateCopy, ApiError } from "../api/client";
import type { CopyRead, Track } from "../types";
import { Cover } from "../components/Cover";
import { StatusBadge } from "../components/StatusBadge";
import { Accordion } from "../components/Accordion";
import { soundModeLabel, STATUSES } from "../lib/ui";
import { AcquisitionPanel, NotesPanel, PressPanel, RatingsPanel } from "./card/editors";

function groupBySide(tracks: Track[]): [string, Track[]][] {
  const map = new Map<string, Track[]>();
  for (const t of tracks) {
    const side = t.side || "—";
    if (!map.has(side)) map.set(side, []);
    map.get(side)!.push(t);
  }
  return [...map.entries()];
}

export function CardScreen() {
  const { id } = useParams<{ id: string }>();
  const [copy, setCopy] = useState<CopyRead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!id) return;
    getCopy(id)
      .then(setCopy)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  if (loading) return <div className="page">Загрузка карточки…</div>;
  if (error || !copy)
    return (
      <div className="page">
        <Link to="/" className="overline">← коллекция</Link>
        <h1>Не найдено</h1>
        <p className="lead">{error ?? "Экземпляр не существует."}</p>
      </div>
    );

  const c = copy;
  const r = c.release;
  const pills = [
    c.year,
    r?.label,
    soundModeLabel(c.pressing?.sound_mode ?? r?.sound_mode),
    ...(r?.genres ?? []),
  ].filter(Boolean) as (string | number)[];

  async function toggleFav() {
    await updateCopy(c.id, { is_favorite: !c.is_favorite });
    reload();
  }
  async function changeStatus(status: string) {
    await updateCopy(c.id, { status });
    reload();
  }

  return (
    <div className="page" style={{ maxWidth: 1180 }}>
      <Link to="/" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
        ← коллекция
      </Link>

      <div
        style={{
          marginTop: 14,
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow)",
          borderRadius: 3,
          overflow: "hidden",
          background: "var(--card)",
        }}
      >
        {/* шапка-бэнд */}
        <div style={{ display: "flex", gap: 28, padding: 28, background: "var(--raise)", flexWrap: "wrap" }}>
          <div style={{ flex: "none", width: 320, maxWidth: "100%" }}>
            <Cover title={c.display_title} artist={c.display_artist} catalog={c.catalog_number} cover={c.cover} />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <StatusBadge status={c.status} />
              <select
                value={c.status}
                onChange={(e) => changeStatus(e.target.value)}
                aria-label="статус"
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 2,
                  background: "var(--field)",
                  color: "var(--ink-soft)",
                  fontSize: 12,
                  padding: "4px 6px",
                }}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {c.copy_total > 1 && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
                  экземпляр №{c.copy_index} из {c.copy_total}
                </span>
              )}
              <button
                onClick={toggleFav}
                aria-label="избранное"
                style={{
                  marginLeft: "auto",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 22,
                  color: c.is_favorite ? "var(--gold)" : "var(--faint)",
                }}
              >
                {c.is_favorite ? "★" : "☆"}
              </button>
            </div>

            <div
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 21,
                color: "var(--red)",
                marginTop: 12,
              }}
            >
              {c.display_artist}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 44, lineHeight: 1.02, color: "var(--ink)" }}>
              {c.display_title}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0" }}>
              {pills.map((p, i) => (
                <span
                  key={i}
                  style={{ border: "1px solid var(--line)", borderRadius: 2, padding: "4px 10px", fontSize: 12, color: "var(--ink-soft)" }}
                >
                  {p}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", gap: 30, marginTop: 8 }}>
              <Rating label="Музыка" value={c.current_album_rating} color="var(--gold)" />
              <div style={{ width: 1, background: "var(--line)" }} />
              <Rating label="Звук пресса" value={c.current_sound_rating} color="var(--blue)" />
            </div>
          </div>
        </div>

        {/* тело */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 30, padding: 28 }}>
          {/* левая колонка */}
          <div>
            <Accordion
              title="Треклист"
              hint={r ? `${groupBySide(r.tracklist).length} стор. · ${r.tracklist.length} треков` : undefined}
            >
              {r &&
                groupBySide(r.tracklist).map(([side, tracks]) => (
                  <div key={side} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        letterSpacing: ".1em",
                        textTransform: "uppercase",
                        color: "var(--red)",
                        marginBottom: 6,
                      }}
                    >
                      Сторона {side}
                    </div>
                    {tracks.map((t) => (
                      <div
                        key={t.position}
                        style={{ display: "flex", alignItems: "baseline", gap: 13, padding: "8px 0", borderBottom: "1px solid var(--hair)" }}
                      >
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--faint)", width: 28 }}>
                          {t.position}
                        </span>
                        <span style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: 19 }}>{t.title}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--faint)" }}>
                          {t.duration_text}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
            </Accordion>

            <Accordion title="История оценок" defaultOpen={false}>
              <RatingsPanel copy={c} reload={reload} />
            </Accordion>

            <Accordion title="Заметки">
              <NotesPanel copy={c} />
            </Accordion>
          </div>

          {/* правая колонка */}
          <div>
            <Accordion title="Пресс и сохранность">
              <PressPanel copy={c} reload={reload} />
            </Accordion>
            <Accordion title="Покупка и стоимость" defaultOpen={false}>
              <AcquisitionPanel copy={c} reload={reload} />
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
}

function Rating({ label, value, color }: { label: string; value?: number | null; color: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 38, lineHeight: 1, color }}>
        {value ?? "—"}
        <span style={{ fontSize: 18, color: "var(--faint)" }}>/5</span>
      </div>
    </div>
  );
}
