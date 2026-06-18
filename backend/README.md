# Бэкенд «Фонотека»

FastAPI + MongoDB + Beanie (Motor). На этом шаге — только скелет и проверка данных:
подключение к БД, инициализация модели из `app/models/catalog.py`, сид справочника
заводов «Мелодии» и health-эндпоинт.

## Запуск

```bash
# 1. Поднять MongoDB (из корня репозитория)
docker compose up -d mongo

# 2. Зависимости (любой вариант)
uv sync                 # если установлен uv
# или
python -m venv .venv && . .venv/bin/activate && pip install -e .

# 3. Конфиг
cp .env.example .env    # при необходимости поправить MONGO_URL и пр.

# 4. Сервер разработки
uvicorn app.main:app --reload
```

Проверка:

```bash
curl localhost:8000/api/health
# {"status":"ok","plants":8}
```

`plants: 8` означает, что подключение к Mongo живое и идемпотентный сид заводов
прошёл (повторный запуск не дублирует записи).

## Структура

- `app/settings.py` — конфигурация (`pydantic-settings`).
- `app/db.py` — клиент Mongo (`tz_aware=True`!) + `init_beanie` + сид заводов.
- `app/models/catalog.py` — модель данных (перенесена из хэндоффа без изменений).
- `app/api/health.py` — `GET /api/health`.
- `app/main.py` — приложение FastAPI + lifespan.
