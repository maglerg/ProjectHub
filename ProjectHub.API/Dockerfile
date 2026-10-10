# ═══════════════════════════════════════════════════════════
#  ЭТАП 1: Сборка (build)
# ═══════════════════════════════════════════════════════════
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["ProjectHub.API.csproj", "./"]
RUN dotnet restore "ProjectHub.API.csproj"

COPY . .
RUN dotnet publish "ProjectHub.API.csproj" \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

# ═══════════════════════════════════════════════════════════
#  ЭТАП 2: Рантайм (runtime)
# ═══════════════════════════════════════════════════════════
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# Создаём папку для загрузок
RUN mkdir -p /app/App_Data/uploads

EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "ProjectHub.API.dll"]