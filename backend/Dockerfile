# Dev-образ бэкенда: зависимости в образе, код прокидывается бинд-маунтом,
# хот-релоад через uvicorn --reload (watchfiles). Не для продакшена.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Сначала только манифест — кэш слоя зависимостей. Пакет ставим editable,
# поэтому копируем исходники (в рантайме их перекроет бинд-маунт того же кода).
COPY . .
RUN pip install -e ".[dev]"

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
