# Фонотека — каталог винила «Мелодия»

Персональный (однопользовательский, self-hosted) сервис для каталогизации домашней
коллекции виниловых пластинок с акцентом на фирму «Мелодия». Метаданные тянутся из
Discogs (слой `Master`/`Release`), а всё личное — экземпляр, сохранность по Goldmine,
две независимые оценки (музыка / звук пресса), заметки, аудио-оцифровки (needledrop)
и журнал прослушиваний — живёт отдельным слоем и не теряется. Всё датировано.

> Текущий статус: **скелет проекта** — структура, зависимости, конфиг, рабочее
> подключение MongoDB/Beanie и оболочка фронтенда с дизайн-токенами. Бизнес-логика
> (Discogs, CRUD, плеер, экраны A–F) — следующий шаг.

## Стек

- **Бэкенд:** Python · FastAPI · MongoDB · Beanie (ODM) · Motor.
- **Фронтенд:** React · Vite · TypeScript.
- **Дизайн:** направление «Конверт» (советский грамзаписывающий дизайн 1960–80-х),
  точные токены и шрифты в `frontend/src/styles/tokens.css`.

## Структура

```
melodia/
├── backend/    — FastAPI + MongoDB + Beanie (см. backend/README.md)
├── frontend/   — React + Vite + TS (оболочка, дизайн-токены, темы)
├── design/     — справочные материалы: бриф, модель данных, дизайн-хэндофф
└── docker-compose.yml — локальный MongoDB
```

## Быстрый старт

```bash
# 1. MongoDB
docker compose up -d mongo

# 2. Бэкенд (см. backend/README.md)
cd backend
cp .env.example .env
uv sync   # или: python -m venv .venv && . .venv/bin/activate && pip install -e .
uvicorn app.main:app --reload
# проверка: curl localhost:8000/api/health  ->  {"status":"ok","plants":8}

# 3. Фронтенд (в новом терминале)
cd frontend
npm install
npm run dev
# открыть http://localhost:5173
```

## Справочные материалы

- `design/brief.md` — продуктовый бриф.
- `design/catalog.py` — исходная модель данных (прод-копия — в `backend/app/models/`).
- `design/handoff-README.md` — спецификация дизайна (токены, экраны, поведение).
- `design/*.dc.html` — HTML-прототипы из Claude Design (референс, не прод-код).
