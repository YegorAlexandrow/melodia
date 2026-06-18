import { useEffect, useState } from "react";
import type { CopyRead } from "../../types";
import {
  updateCopy,
  addRating,
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  getPlants,
  type NoteRead,
  type PlantRead,
} from "../../api/client";
import { Button, Label, Select, Text, TextArea } from "../../components/form";
import { GRADES, SOUND_MODES, gradeColor, formatEpoch } from "../../lib/ui";

interface PanelProps {
  copy: CopyRead;
  reload: () => void;
}

function Row({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
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

// --- Пресс и сохранность ---
export function PressPanel({ copy, reload }: PanelProps) {
  const [edit, setEdit] = useState(false);
  const [plants, setPlants] = useState<PlantRead[]>([]);
  const p = copy.pressing ?? {};
  const g = copy.grade ?? {};
  const [plant, setPlant] = useState(p.plant_code ?? "");
  const [matrix, setMatrix] = useState(p.matrix_runout ?? "");
  const [mode, setMode] = useState(p.sound_mode ?? "");
  const [gost, setGost] = useState(p.gost ?? "");
  const [pyear, setPyear] = useState(p.pressing_year ? String(p.pressing_year) : "");
  const [media, setMedia] = useState(g.media ?? "");
  const [sleeve, setSleeve] = useState(g.sleeve ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (edit && plants.length === 0) getPlants().then(setPlants).catch(() => {});
  }, [edit, plants.length]);

  async function save() {
    setSaving(true);
    await updateCopy(copy.id, {
      pressing: {
        plant_code: plant || null,
        matrix_runout: matrix || null,
        sound_mode: mode || null,
        gost: gost || null,
        pressing_year: pyear ? Number(pyear) : null,
        speed_rpm: copy.pressing?.speed_rpm ?? 33,
      },
      grade: { media: media || null, sleeve: sleeve || null },
    });
    setSaving(false);
    setEdit(false);
    reload();
  }

  if (!edit) {
    return (
      <div>
        <Row label="Завод" value={p.plant_code} />
        <Row label="Матрица" value={p.matrix_runout} mono />
        <Row label="Режим · скорость" value={[SOUND_MODES.find((s) => s.value === p.sound_mode)?.label, p.speed_rpm && `${p.speed_rpm} об/мин`].filter(Boolean).join(" · ")} />
        <Row label="ГОСТ" value={p.gost} mono />
        <Row label="Год пресса" value={p.pressing_year} />
        <div style={{ display: "flex", gap: 12, margin: "14px 0" }}>
          <GradeBox label="пластинка" grade={g.media} />
          <GradeBox label="конверт" grade={g.sleeve} />
        </div>
        <Button variant="outline" small onClick={() => setEdit(true)}>
          ✎ редактировать
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div>
        <Label>Завод</Label>
        <Select value={plant} onChange={setPlant} placeholder="— не указан —" options={plants.map((pl) => ({ value: pl.code, label: pl.name }))} />
      </div>
      <div>
        <Label>Год пресса</Label>
        <Text value={pyear} onChange={setPyear} placeholder="1977" mono />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <Label>Матрица из выплавки</Label>
        <Text value={matrix} onChange={setMatrix} placeholder="С60 07271 А-2 / 4-1-2" mono />
      </div>
      <div>
        <Label>Режим</Label>
        <Select value={mode} onChange={setMode} placeholder="—" options={SOUND_MODES} />
      </div>
      <div>
        <Label>ГОСТ</Label>
        <Text value={gost} onChange={setGost} placeholder="ГОСТ 5289-73" mono />
      </div>
      <div>
        <Label>Сохранность пластинки</Label>
        <Select value={media} onChange={setMedia} placeholder="—" options={GRADES.map((x) => ({ value: x, label: x }))} />
      </div>
      <div>
        <Label>Сохранность конверта</Label>
        <Select value={sleeve} onChange={setSleeve} placeholder="—" options={GRADES.map((x) => ({ value: x, label: x }))} />
      </div>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, marginTop: 6 }}>
        <Button variant="blue" onClick={save} disabled={saving}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </Button>
        <Button variant="outline" onClick={() => setEdit(false)}>
          Отмена
        </Button>
      </div>
    </div>
  );
}

function GradeBox({ label, grade }: { label: string; grade?: string | null }) {
  return (
    <div style={{ textAlign: "center", background: "var(--field)", padding: "12px 18px", borderRadius: 2 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", color: "var(--muted)" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 25, color: gradeColor(grade) }}>
        {grade ?? "—"}
      </div>
    </div>
  );
}

// --- Покупка и хранение ---
export function AcquisitionPanel({ copy, reload }: PanelProps) {
  const [edit, setEdit] = useState(false);
  const a = copy.acquisition ?? {};
  const [source, setSource] = useState(a.source ?? "");
  const [place, setPlace] = useState(a.place ?? "");
  const [price, setPrice] = useState(a.price != null ? String(a.price) : "");
  const [date, setDate] = useState(a.acquired_on ?? "");
  const [storage, setStorage] = useState(copy.storage_location ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await updateCopy(copy.id, {
      acquisition: {
        source: source || null,
        place: place || null,
        price: price ? Number(price) : null,
        currency: a.currency ?? "RUB",
        acquired_on: date || null,
      },
      storage_location: storage || null,
    });
    setSaving(false);
    setEdit(false);
    reload();
  }

  if (!edit) {
    return (
      <div>
        <Row label="Где" value={a.source ?? a.place} />
        <Row label="Когда" value={a.acquired_on} mono />
        <Row label="Цена" value={a.price != null ? `${a.price} ${a.currency ?? ""}` : null} />
        <Row label="Полка" value={copy.storage_location} />
        <div style={{ marginTop: 12 }}>
          <Button variant="outline" small onClick={() => setEdit(true)}>
            ✎ редактировать
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div>
        <Label>Источник</Label>
        <Text value={source} onChange={setSource} placeholder="Авито / блошка / подарок" />
      </div>
      <div>
        <Label>Место</Label>
        <Text value={place} onChange={setPlace} placeholder="Москва" />
      </div>
      <div>
        <Label>Цена (RUB)</Label>
        <Text value={price} onChange={setPrice} placeholder="1500" mono />
      </div>
      <div>
        <Label>Дата покупки</Label>
        <Text value={date} onChange={setDate} placeholder="2024-03-15" mono />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <Label>Полка / место хранения</Label>
        <Text value={storage} onChange={setStorage} placeholder="полка 3, секция Б" />
      </div>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10 }}>
        <Button variant="blue" onClick={save} disabled={saving}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </Button>
        <Button variant="outline" onClick={() => setEdit(false)}>
          Отмена
        </Button>
      </div>
    </div>
  );
}

// --- Оценки: добавление + история ---
export function RatingsPanel({ copy, reload }: PanelProps) {
  const [album, setAlbum] = useState("");
  const [sound, setSound] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const opts = ["", "1", "2", "3", "4", "5"].map((x) => ({ value: x, label: x || "—" }));

  async function save() {
    if (!album && !sound) return;
    setSaving(true);
    await addRating(copy.id, {
      album: album ? Number(album) : null,
      sound: sound ? Number(sound) : null,
      note: note || undefined,
    });
    setSaving(false);
    setAlbum("");
    setSound("");
    setNote("");
    reload();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ width: 90 }}>
          <Label>Музыка</Label>
          <Select value={album} onChange={setAlbum} options={opts} />
        </div>
        <div style={{ width: 90 }}>
          <Label>Звук</Label>
          <Select value={sound} onChange={setSound} options={opts} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <Label>Заметка к оценке</Label>
          <Text value={note} onChange={setNote} placeholder="напр. переслушал через год" />
        </div>
        <Button variant="blue" onClick={save} disabled={saving || (!album && !sound)}>
          Поставить
        </Button>
      </div>

      <div style={{ marginTop: 16 }}>
        {copy.rating_history.length === 0 && (
          <div style={{ fontStyle: "italic", color: "var(--muted)", fontFamily: "var(--font-display)" }}>
            Оценок пока нет
          </div>
        )}
        {[...copy.rating_history].reverse().map((r, i) => (
          <div
            key={i}
            style={{ display: "flex", gap: 14, alignItems: "baseline", padding: "6px 0", borderBottom: "1px solid var(--hair)" }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--red)", width: 110 }}>
              {formatEpoch(r.rated_at)}
            </span>
            {r.album != null && <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)" }}>муз {r.album}</span>}
            {r.sound != null && <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--blue)" }}>звук {r.sound}</span>}
            {r.note && <span style={{ fontStyle: "italic", fontSize: 13, color: "var(--ink-soft)" }}>{r.note}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Заметки экземпляра ---
export function NotesPanel({ copy }: { copy: CopyRead }) {
  const [notes, setNotes] = useState<NoteRead[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  function load() {
    listNotes({ copy_id: copy.id }).then(setNotes).catch(() => {});
  }
  useEffect(load, [copy.id]);

  async function add() {
    if (!body.trim()) return;
    setSaving(true);
    await createNote({ body, title: title || undefined, target_kind: "copy", copy_id: copy.id, pinned });
    setSaving(false);
    setTitle("");
    setBody("");
    setPinned(false);
    load();
  }

  async function togglePin(n: NoteRead) {
    await updateNote(n.id, { pinned: !n.pinned });
    load();
  }
  async function remove(n: NoteRead) {
    await deleteNote(n.id);
    load();
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <Label>Заголовок (необязательно)</Label>
        <Text value={title} onChange={setTitle} placeholder="Про пресс" />
        <div style={{ height: 8 }} />
        <Label>Текст (markdown)</Label>
        <TextArea value={body} onChange={setBody} placeholder="Тёплая середина, верх чуть смягчён…" />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> закрепить
          </label>
          <Button variant="blue" small onClick={add} disabled={saving || !body.trim()}>
            + добавить заметку
          </Button>
        </div>
      </div>

      {notes.length === 0 && (
        <div style={{ fontStyle: "italic", color: "var(--muted)", fontFamily: "var(--font-display)" }}>
          Заметок пока нет
        </div>
      )}
      {notes.map((n) => (
        <div
          key={n.id}
          style={{
            borderLeft: `3px solid ${n.pinned ? "var(--gold)" : "var(--blue)"}`,
            padding: "2px 0 10px 12px",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600 }}>{n.title || "Заметка"}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--faint)" }}>{formatEpoch(n.created_at)}</span>
            {n.pinned && <span style={{ fontSize: 11, color: "var(--gold)" }}>★ закреплено</span>}
            <span style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <button onClick={() => togglePin(n)} style={linkBtn}>{n.pinned ? "открепить" : "закрепить"}</button>
              <button onClick={() => remove(n)} style={{ ...linkBtn, color: "var(--red)" }}>удалить</button>
            </span>
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5, marginTop: 3, whiteSpace: "pre-wrap" }}>
            {n.body}
          </div>
        </div>
      ))}
    </div>
  );
}

const linkBtn = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--muted)",
} as const;
