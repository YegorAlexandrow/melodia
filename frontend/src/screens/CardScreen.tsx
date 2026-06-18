import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCopy, ApiError } from "../api/client";
import type { CopyRead, Track } from "../types";
import { Cover } from "../components/Cover";
import { StatusBadge } from "../components/StatusBadge";
import { Accordion } from "../components/Accordion";
import { soundModeLabel } from "../lib/ui";

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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getCopy(id)
      .then(setCopy)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page">Загрузка карточки…</div>;
  if (error || !copy)
    return (
      <div className="page">
        <Link to="/" className="overline">← коллекция</Link>
        <h1>Не найдено</h1>
        <p className="lead">{error ?? "Экземпляр не существует."}</p>
      </div>
    );

  const r = copy.release;
  const pills = [
    copy.year,
    r?.label,
    soundModeLabel(copy.pressing?.sound_mode ?? r?.sound_mode),
    ...(r?.genres ?? []),
  ].filter(Boolean) as (string | number)[];

  return (
    <div className="page" style={{ maxWidth: 1180 }}>
      <Link to="/" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
        ← коллекция
      </Link>

      {/* карточка */}
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
        <div
          style={{
            display: "flex",
            gap: 28,
            padding: 28,
            background: "var(--raise)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "none", width: 320, maxWidth: "100%" }}>
            <Cover
              title={copy.display_title}
              artist={copy.display_artist}
              catalog={copy.catalog_number}
              cover={copy.cover}
            />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <StatusBadge status={copy.status} />
              {copy.copy_total > 1 && (
                <span
                  style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}
                >
                  экземпляр №{copy.copy_index} из {copy.copy_total}
                </span>
              )}
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 22,
                  color: copy.is_favorite ? "var(--gold)" : "var(--faint)",
                }}
                title="избранное"
              >
                {copy.is_favorite ? "★" : "☆"}
              </span>
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
              {copy.display_artist}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 44,
                lineHeight: 1.02,
                color: "var(--ink)",
              }}
            >
              {copy.display_title}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0" }}>
              {pills.map((p, i) => (
                <span
                  key={i}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 2,
                    padding: "4px 10px",
                    fontSize: 12,
                    color: "var(--ink-soft)",
                  }}
                >
                  {p}
                </span>
              ))}
            </div>

            {/* две оценки */}
            <div style={{ display: "flex", gap: 30, marginTop: 8 }}>
              <Rating label="Музыка" value={copy.current_album_rating} color="var(--gold)" />
              <div style={{ width: 1, background: "var(--line)" }} />
              <Rating label="Звук пресса" value={copy.current_sound_rating} color="var(--blue)" />
            </div>
          </div>
        </div>

        {/* тело */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr",
            gap: 30,
            padding: 28,
          }}
        >
          {/* левая колонка */}
          <div>
            <Accordion
              title="Треклист"
              hint={
                r
                  ? `${groupBySide(r.tracklist).length} стор. · ${r.tracklist.length} треков`
                  : undefined
              }
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
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 13,
                          padding: "8px 0",
                          borderBottom: "1px solid var(--hair)",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 12,
                            color: "var(--faint)",
                            width: 28,
                          }}
                        >
                          {t.position}
                        </span>
                        <span style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: 19 }}>
                          {t.title}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 12,
                            color: "var(--faint)",
                          }}
                        >
                          {t.duration_text}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
            </Accordion>
          </div>

          {/* правая колонка */}
          <div>
            <Accordion title="Пресс и сохранность">
              <KV label="Завод" value={copy.pressing?.plant_code} />
              <KV label="Матрица" value={copy.pressing?.matrix_runout} mono />
              <KV
                label="Режим · скорость"
                value={[soundModeLabel(copy.pressing?.sound_mode), copy.pressing?.speed_rpm && `${copy.pressing.speed_rpm} об/мин`]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <KV label="ГОСТ" value={copy.pressing?.gost} mono />
              <KV label="Год пресса" value={copy.pressing?.pressing_year} />
              <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
                <GradeBox label="пластинка" grade={copy.grade?.media} color="var(--green)" />
                <GradeBox label="конверт" grade={copy.grade?.sleeve} color="var(--gold)" />
              </div>
            </Accordion>

            <Accordion title="Покупка и стоимость" defaultOpen={false}>
              <KV label="Где" value={copy.acquisition?.place ?? copy.acquisition?.source} />
              <KV label="Когда" value={copy.acquisition?.acquired_on} mono />
              <KV
                label="Цена"
                value={
                  copy.acquisition?.price != null
                    ? `${copy.acquisition.price} ${copy.acquisition.currency ?? ""}`
                    : null
                }
              />
              <KV label="Полка" value={copy.storage_location} />
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

function KV({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "7px 0",
        borderBottom: "1px dotted var(--line)",
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: 13 }}>{label}</span>
      <span
        style={{
          textAlign: "right",
          fontSize: 14,
          color: "var(--ink-soft)",
          fontFamily: mono ? "var(--font-mono)" : undefined,
        }}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function GradeBox({ label, grade, color }: { label: string; grade?: string | null; color: string }) {
  return (
    <div style={{ textAlign: "center", background: "var(--field)", padding: "12px 18px", borderRadius: 2 }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 25, color }}>
        {grade ?? "—"}
      </div>
    </div>
  );
}
