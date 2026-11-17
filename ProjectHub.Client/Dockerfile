# Этап 1: сборка React-приложения (Create React App)
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG REACT_APP_API_URL=/api
ARG REACT_APP_HUB_URL=/hubs/chat
ARG REACT_APP_API_ORIGIN=

ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_HUB_URL=${REACT_APP_HUB_URL}
ENV REACT_APP_API_ORIGIN=${REACT_APP_API_ORIGIN}

# CRA считает ESLint warnings фатальными при CI=true; предупреждения остаются видимыми.
RUN CI=false npm run build

# Этап 2: раздача собранной статики через Nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
