# Dev-образ фронтенда: node_modules собираются в образе (под musl/alpine),
# код прокидывается бинд-маунтом, хот-релоад через Vite dev-server. Не для продакшена.
FROM node:22-alpine

WORKDIR /app

# Кэш слоя зависимостей: ставим по манифесту до копирования кода.
COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
