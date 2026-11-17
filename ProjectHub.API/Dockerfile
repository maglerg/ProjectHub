# Этап 1: восстановление зависимостей и публикация приложения
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["ProjectHub.API.csproj", "./"]
RUN dotnet restore "ProjectHub.API.csproj"

COPY . .
RUN dotnet publish "ProjectHub.API.csproj" \
    --configuration Release \
    --output /app/publish \
    /p:UseAppHost=false

# Этап 2: минимальный runtime-образ
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# === ДОБАВЛЕНО: Установка библиотеки Kerberos ===
# Это уберет ошибку "Cannot load library libgssapi_krb5.so.2"
RUN apt-get update && apt-get install -y libgssapi-krb5-2 && rm -rf /var/lib/apt/lists/*
# =================================================

COPY --from=build /app/publish .
RUN mkdir -p /app/App_Data/uploads /app/logs

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080
ENTRYPOINT ["dotnet", "ProjectHub.API.dll"]