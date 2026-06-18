#!/usr/bin/env bash
# Подготовка окружения для сессий Claude Code на вебе:
# ставит зависимости бэкенда и фронтенда, чтобы можно было сразу гонять тесты/линт.
# Идемпотентно и тихо: если уже установлено — пропускает.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[session-setup] backend deps"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv venv --python 3.11 .venv >/dev/null 2>&1 || true && uv pip install -e ".[dev]" >/dev/null 2>&1) || \
    echo "[session-setup] backend: пропущено (нет сети?)"
else
  echo "[session-setup] uv не найден — пропускаю backend"
fi

echo "[session-setup] frontend deps"
if command -v npm >/dev/null 2>&1; then
  (cd frontend && [ -d node_modules ] || npm install >/dev/null 2>&1) || \
    echo "[session-setup] frontend: пропущено (нет сети?)"
else
  echo "[session-setup] npm не найден — пропускаю frontend"
fi

echo "[session-setup] готово"
