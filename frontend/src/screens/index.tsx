// Экраны A, D, E, F — пока заглушки (реализуются на следующих этапах).
// B (Добавить) и C (Карточка) — в отдельных модулях.

export { AddScreen } from "./AddScreen";
export { CardScreen } from "./CardScreen";

interface StubProps {
  overline: string;
  title: string;
  note: string;
}

function ScreenStub({ overline, title, note }: StubProps) {
  return (
    <div className="page">
      <div className="overline">{overline}</div>
      <h1>{title}</h1>
      <p className="lead">{note}</p>
    </div>
  );
}

export function CollectionScreen() {
  return (
    <ScreenStub
      overline="Личное собрание · винил"
      title="Коллекция"
      note="Экран A. Сетка обложек / плотный список, поиск и фильтры. Скоро."
    />
  );
}

export function NotesScreen() {
  return (
    <ScreenStub
      overline="Сквозная лента"
      title="Заметки"
      note="Экран D. Все заметки коллекции по дате. Скоро."
    />
  );
}

export function AudioScreen() {
  return (
    <ScreenStub
      overline="Оцифровки"
      title="Привязать аудио"
      note="Экран E. Привязка записи к треку / стороне / диску / референсу. Скоро."
    />
  );
}

export function StatsScreen() {
  return (
    <ScreenStub
      overline="Сводка"
      title="Статистика"
      note="Экран F. Дашборд: по заводам, жанрам, давно не слушал. Скоро."
    />
  );
}
