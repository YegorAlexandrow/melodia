import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getCopy, createAudio, ApiError } from "../api/client";
import type { CopyRead } from "../types";
import { Button, Label, Select, Text } from "../components/form";

type Binding = "track" | "side" | "album" | "ref";

const BINDINGS: { value: Binding; label: string }[] = [
  { value: "track", label: "К треку" },
  { value: "side", label: "К стороне" },
  { value: "album", label: "Ко всему диску" },
  { value: "ref", label: "Внешний референс" },
];

export function AudioScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copy, setCopy] = useState<CopyRead | null>(null);

  const [binding, setBinding] = useState<Binding>("side");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [trackPos, setTrackPos] = useState("");
  const [side, setSide] = useState("A");
  const [cartridge, setCartridge] = useState("");
  const [preamp, setPreamp] = useState("");
  const [adc, setAdc] = useState("");
  const [processing, setProcessing] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) getCopy(id).then(setCopy).catch(() => {});
  }, [id]);

  const sides = useMemo(() => {
    const s = new Set<string>();
    copy?.release?.tracklist.forEach((t) => t.side && s.add(t.side));
    return [...s];
  }, [copy]);

  async function save() {
    if (!id) return;
    if (binding === "ref" ? !url.trim() : !file) {
      setError(binding === "ref" ? "Укажите ссылку" : "Выберите файл");
      return;
    }
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.set("copy_id", id);
    fd.set("binding", binding);
    if (title) fd.set("title", title);
    if (binding === "ref") {
      fd.set("url", url.trim());
      fd.set("source", "other");
    } else {
      fd.set("file", file as File);
      fd.set("source", "needledrop");
      if (cartridge) fd.set("cartridge", cartridge);
      if (preamp) fd.set("preamp", preamp);
      if (adc) fd.set("adc", adc);
      if (processing) fd.set("processing", processing);
    }
    if (binding === "track" && trackPos) fd.set("track_position", trackPos);
    if (binding === "side") fd.set("side", side);

    try {
      await createAudio(fd);
      navigate(`/copy/${id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить");
      setSaving(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 880 }}>
      <Link
        to={id ? `/copy/${id}` : "/"}
        style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}
      >
        ← {copy?.display_title ?? "назад"}
      </Link>
      <h1 style={{ fontSize: 40 }}>Привязать аудио</h1>

      {error && <div style={{ color: "var(--red)", marginTop: 8 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 20 }}>
        {/* левая колонка: файл + привязка */}
        <div>
          {binding !== "ref" ? (
            <label
              style={{
                display: "block",
                border: "1.5px dashed var(--line)",
                borderRadius: 3,
                padding: 22,
                textAlign: "center",
                background: "var(--card)",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 26, color: "var(--faint)" }}>♪</div>
              <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--muted)", marginTop: 6 }}>
                {file ? file.name : "Выберите аудиофайл (FLAC/WAV/MP3)"}
              </div>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={{ display: "none" }}
              />
            </label>
          ) : (
            <div>
              <Label>Ссылка (YouTube / чужая оцифровка)</Label>
              <Text value={url} onChange={setUrl} placeholder="https://youtu.be/…" mono />
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <Label>Привязка</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {BINDINGS.map((b) => {
                const active = binding === b.value;
                return (
                  <label
                    key={b.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      border: `1px solid ${active ? "var(--blue)" : "var(--line)"}`,
                      borderRadius: 2,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="binding"
                      checked={active}
                      onChange={() => setBinding(b.value)}
                    />
                    <span style={{ fontSize: 14 }}>{b.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {binding === "track" && (
            <div style={{ marginTop: 14 }}>
              <Label>Трек</Label>
              <Select
                value={trackPos}
                onChange={setTrackPos}
                placeholder="— выберите —"
                options={(copy?.release?.tracklist ?? []).map((t) => ({
                  value: t.position,
                  label: `${t.position} · ${t.title}`,
                }))}
              />
            </div>
          )}
          {binding === "side" && sides.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <Label>Сторона</Label>
              <Select value={side} onChange={setSide} options={sides.map((s) => ({ value: s, label: s }))} />
            </div>
          )}
        </div>

        {/* правая колонка: метаданные */}
        <div>
          <Label>Название</Label>
          <Text value={title} onChange={setTitle} placeholder="Сторона A — оцифровка" />

          {binding !== "ref" && (
            <>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", margin: "16px 0 8px", textTransform: "uppercase", letterSpacing: ".08em" }}>
                Обстоятельства оцифровки
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <Label>Головка звукоснимателя</Label>
                  <Text value={cartridge} onChange={setCartridge} placeholder="Audio-Technica VM95E" />
                </div>
                <div>
                  <Label>Фонокорректор</Label>
                  <Text value={preamp} onChange={setPreamp} placeholder="…" />
                </div>
                <div>
                  <Label>АЦП</Label>
                  <Text value={adc} onChange={setAdc} placeholder="…" />
                </div>
                <div>
                  <Label>Обработка</Label>
                  <Text value={processing} onChange={setProcessing} placeholder="click removal RX11 / без обработки" />
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--faint)", marginTop: 8 }}>
                Формат, частота и разрядность подтянутся из файла автоматически.
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <Button variant="blue" onClick={save} disabled={saving}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </Button>
        <Button variant="outline" onClick={() => navigate(id ? `/copy/${id}` : "/")}>
          Отмена
        </Button>
      </div>
    </div>
  );
}
