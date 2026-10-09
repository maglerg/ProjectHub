# ═══════════════════════════════════════════════════════════
#  ЭТАП 1: Сборка (build)
# ═══════════════════════════════════════════════════════════
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# 1. Копируем ТОЛЬКО .csproj — это кеширует restore
COPY ["ProjectHub.API.csproj", "./"]
RUN dotnet restore "ProjectHub.API.csproj"

# 2. Копируем всё остальное
COPY . .

# 3. Публикуем в Release в папку /app/publish
RUN dotnet publish "ProjectHub.API.csproj" \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

# ═══════════════════════════════════════════════════════════
#  ЭТАП 2: Рантайм (runtime)
# ═══════════════════════════════════════════════════════════
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Создаём непривилегированного пользователя (базовая безопасность)
RUN useradd -m -u 1000 appuser

# Копируем опубликованные файлы из этапа сборки
COPY --from=build /app/publish .

# Создаём папку для загрузок и отдаём её appuser
RUN mkdir -p /app/App_Data/uploads && chown -R appuser:appuser /app

# Переключаемся на appuser
USER appuser

# Порт, на котором слушает приложение
EXPOSE 8080

# Переменные окружения
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Точка входа
ENTRYPOINT ["dotnet", "ProjectHub.API.dll"]