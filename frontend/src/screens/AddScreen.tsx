import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { searchDiscogs, importRelease, createCopies, ApiError } from "../api/client";
import type { DiscogsCandidate, ReleaseRead, Track } from "../types";
import { Cover } from "../components/Cover";

function groupBySide(tracks: Track[]): [string, Track[]][] {
  const map = new Map<string, Track[]>();
  for (const t of tracks) {
    const side = t.side || "—";
    if (!map.has(side)) map.set(side, []);
    map.get(side)!.push(t);
  }
  return [...map.entries()];
}

function matchLabel(c: DiscogsCandidate, queryNorm?: string | null) {
  if (queryNorm && c.catalog_number_norm === queryNorm) {
    return { text: "точное", bg: "var(--green)", fg: "#eee2cf" };
  }
  return { text: "версия", bg: "var(--gold)", fg: "#1c1a17" };
}

export function AddScreen() {
  const navigate = useNavigate();
  const [cat, setCat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DiscogsCandidate[]>([]);
  const [queryNorm, setQueryNorm] = useState<string | null>(null);
  const [rateRemaining, setRateRemaining] = useState<number | null>(null);
  const [rateLimit, setRateLimit] = useState<number | null>(null);

  const [selected, setSelected] = useState<DiscogsCandidate | null>(null);
  const [release, setRelease] = useState<ReleaseRead | null>(null);
  const [loadingRelease, setLoadingRelease] = useState(false);
  const [multi, setMulti] = useState(false);
  const [count, setCount] = useState(2);
  const [creating, setCreating] = useState(false);

  async function doSearch() {
    if (!cat.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setSelected(null);
    setRelease(null);
    try {
      const r = await searchDiscogs({ cat: cat.trim() });
      setResults(r.results);
      setQueryNorm(r.query_norm ?? null);
      setRateRemaining(r.rate_limit_remaining ?? null);
      setRateLimit(r.rate_limit ?? null);
      if (r.results.length === 0) setError("Ничего не найдено. Проверьте каталожный номер.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка поиска");
    } finally {
      setLoading(false);
    }
  }

  async function selectCandidate(c: DiscogsCandidate) {
    setSelected(c);
    setRelease(null);
    setLoadingRelease(true);
    try {
      setRelease(await importRelease(c.discogs_release_id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить релиз");
    } finally {
      setLoadingRelease(false);
    }
  }

  async function create() {
    if (!selected) return;
    setCreating(true);
    try {
      const copies = await createCopies(selected.discogs_release_id, multi ? count : 1);
      navigate(copies.length === 1 ? `/copy/${copies[0].id}` : "/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось создать экземпляр");
      setCreating(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 1080 }}>
      <Link to="/" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
        ← коллекция
      </Link>
      <h1 style={{ fontSize: 40 }}>Добавить пластинку</h1>
      <p className="lead">
        Введите каталожный номер — найдём издание в Discogs и создадим карточку экземпляра
        с треклистом и сторонами.
      </p>

      {/* строка ввода */}
      <div style={{ display: "flex", gap: 12, alignItems: "stretch", marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            background: "var(--card)",
            border: "1.5px solid var(--ink)",
            borderRadius: 2,
            padding: "12px 15px",
            flex: 1,
            maxWidth: 460,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            Кат. №
          </span>
          <input
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="С60 07271"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "var(--font-mono)",
              fontSize: 15,
              color: "var(--ink)",
            }}
          />
          <span style={{ width: 2, height: 16, background: "var(--gold)" }} />
        </div>
        <button
          onClick={doSearch}
          disabled={loading}
          style={{
            background: "var(--blue)",
            color: "#f3ecdd",
            border: "none",
            borderRadius: 2,
            padding: "0 22px",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          {loading ? "Ищем…" : "Искать"}
        </button>
      </div>
      {queryNorm && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--faint)",
            marginTop: 8,
          }}
        >
          нормализовано: {queryNorm}
        </div>
      )}

      {error && (
        <div style={{ color: "var(--red)", marginTop: 16, fontSize: 14 }}>{error}</div>
      )}

      {/* результаты */}
      {results.length > 0 && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              margin: "30px 0 14px",
              borderBottom: "1px solid var(--line)",
              paddingBottom: 8,
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22 }}>
              Результаты Discogs
            </span>
            <span
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--faint)" }}
            >
              {results.length} совпадений
              {rateRemaining != null && ` · лимит ${rateRemaining}/${rateLimit ?? "?"}`}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {results.map((c) => {
              const m = matchLabel(c, queryNorm);
              const isSel = selected?.discogs_release_id === c.discogs_release_id;
              return (
                <button
                  key={c.discogs_release_id}
                  onClick={() => selectCandidate(c)}
                  style={{
                    display: "flex",
                    gap: 16,
                    padding: 16,
                    textAlign: "left",
                    border: `1.5px solid ${isSel ? "var(--red)" : "var(--line)"}`,
                    borderRadius: 2,
                    background: "var(--card)",
                    cursor: "pointer",
                    color: "var(--ink)",
                  }}
                >
                  <div style={{ flex: "none", width: 72 }}>
                    <Cover
                      title={c.title.includes(" - ") ? c.title.split(" - ")[1] : c.title}
                      artist={c.artist}
                      cover={c.cover_image ? ({ url: c.cover_image } as never) : null}
                      size={72}
                    />
                  </div>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 2,
                          background: m.bg,
                          color: m.fg,
                        }}
                      >
                        {isSel ? "выбрано ✓" : m.text}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--faint)",
                        }}
                      >
                        {c.catalog_number}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 19,
                        fontWeight: 600,
                        marginTop: 5,
                      }}
                    >
                      {c.title.includes(" - ") ? c.title.split(" - ")[1] : c.title}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>{c.artist}</div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--faint)",
                        marginTop: 6,
                      }}
                    >
                      {[c.year, c.country, c.formats.slice(0, 2).join(" ")]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* панель подтверждения */}
      {selected && (
        <div
          style={{
            marginTop: 26,
            border: "1.5px solid var(--line)",
            borderRadius: 3,
            background: "var(--card)",
            padding: 22,
          }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22 }}>
            Будет создан экземпляр
          </div>
          {loadingRelease && (
            <div style={{ color: "var(--muted)", marginTop: 10 }}>Загружаем треклист…</div>
          )}
          {release && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr",
                gap: 24,
                marginTop: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: ".1em",
                    color: "var(--muted)",
                    marginBottom: 8,
                  }}
                >
                  Треклист
                </div>
                {groupBySide(release.tracklist).map(([side, tracks]) => (
                  <div key={side} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--red)",
                        marginBottom: 4,
                      }}
                    >
                      Сторона {side}
                    </div>
                    {tracks.map((t) => (
                      <div
                        key={t.position}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "baseline",
                          padding: "3px 0",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--faint)",
                            width: 26,
                          }}
                        >
                          {t.position}
                        </span>
                        <span style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: 16 }}>
                          {t.title}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--faint)",
                          }}
                        >
                          {t.duration_text}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>
                <Field label="Артист" value={release.primary_artist} />
                <Field
                  label="Год · страна"
                  value={[release.released_year, release.country].filter(Boolean).join(" · ")}
                />
                <Field label="Формат" value={release.formats.join(" · ")} />
                <Field
                  label="Матрица"
                  value={
                    release.identifiers.find((i) => i.type.includes("Matrix"))?.value ?? "—"
                  }
                />
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--green)",
                    marginTop: 10,
                  }}
                >
                  Обложка: кэшируется локально ✓
                </div>

                <label
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginTop: 18,
                    cursor: "pointer",
                  }}
                >
                  <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
                  <span>У меня несколько прессов этого издания</span>
                </label>
                {multi && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>сколько:</span>
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={count}
                      onChange={(e) => setCount(Math.max(2, Number(e.target.value)))}
                      style={{
                        width: 64,
                        padding: "6px 8px",
                        border: "1px solid var(--line)",
                        borderRadius: 2,
                        background: "var(--field)",
                        color: "var(--ink)",
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
                  <button
                    onClick={create}
                    disabled={creating}
                    style={{
                      background: "var(--red)",
                      color: "#f3ecdd",
                      border: "none",
                      borderRadius: 2,
                      padding: "10px 18px",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    {creating ? "Создаём…" : "Создать карточку"}
                  </button>
                  <button
                    onClick={() => {
                      setSelected(null);
                      setRelease(null);
                    }}
                    style={{
                      border: "1px solid var(--line)",
                      background: "transparent",
                      color: "var(--ink-soft)",
                      borderRadius: 2,
                      padding: "10px 18px",
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "6px 0",
        borderBottom: "1px dotted var(--line)",
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: 13 }}>{label}</span>
      <span style={{ textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}
