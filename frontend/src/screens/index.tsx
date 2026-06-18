// Экраны A–F — пока заглушки. Структура под следующий шаг (бизнес-логика и
// пиксель-в-пиксель реализация по дизайн-хэндоффу).

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
      note="Экран A. Сетка обложек / плотный список, поиск и фильтры. Заглушка."
    />
  );
}

export function AddScreen() {
  return (
    <ScreenStub
      overline="Discogs"
      title="Добавить пластинку"
      note="Экран B. Поиск издания по каталожному номеру и создание экземпляра. Заглушка."
    />
  );
}

export function CardScreen() {
  return (
    <ScreenStub
      overline="Экземпляр"
      title="Карточка пластинки"
      note="Экран C. Рабочее место: треклист, аудио, оценки, пресс, заметки, журнал. Заглушка."
    />
  );
}

export function NotesScreen() {
  return (
    <ScreenStub
      overline="Сквозная лента"
      title="Заметки"
      note="Экран D. Все заметки коллекции по дате. Заглушка."
    />
  );
}

export function AudioScreen() {
  return (
    <ScreenStub
      overline="Оцифровки"
      title="Привязать аудио"
      note="Экран E. Привязка записи к треку / стороне / диску / референсу. Заглушка."
    />
  );
}

export function StatsScreen() {
  return (
    <ScreenStub
      overline="Сводка"
      title="Статистика"
      note="Экран F. Дашборд: по заводам, жанрам, давно не слушал. Заглушка."
    />
  );
}
