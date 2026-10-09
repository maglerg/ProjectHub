# ═══════════════════════════════════════════════════════════
#  ЭТАП 1: Сборка React
# ═══════════════════════════════════════════════════════════
FROM node:20-alpine AS build
WORKDIR /app

# 1. Копируем манифесты
COPY package*.json ./

# 2. Устанавливаем зависимости
RUN npm ci

# 3. Копируем исходники
COPY . .

# 4. Аргумент сборки — URL API (для CRA нужен префикс REACT_APP_)
ARG REACT_APP_API_URL=/api
ARG REACT_APP_HUB_URL=/hubs/chat
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_HUB_URL=$REACT_APP_HUB_URL

# 5. Собираем прод-версию
RUN npm run build

# ═══════════════════════════════════════════════════════════
#  ЭТАП 2: Nginx
# ═══════════════════════════════════════════════════════════
FROM nginx:alpine

# Копируем конфиг Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранный фронт из этапа сборки
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]