# ProjectHub

> Веб-платформа для совместной работы над проектами: Kanban-доски, чаты, голосования, уведомления в реальном времени.

[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](https://www.docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Живое демо](https://[YOUR_DOMAIN]) · [Скриншоты](#-скриншоты) · [Сообщить о баге](https://github.com/[YOUR_USERNAME]/projecthub/issues)

---

## О проекте

**ProjectHub** — это fullstack веб-приложение для командной работы над проектами. Позволяет создавать проекты, приглашать участников, вести задачи на Kanban-доске, общаться в чатах, проводить голосования и получать уведомления в реальном времени.

Проект написан как портфолио и демонстрирует работу с:
- REST API на **.NET 10**
- Real-time коммуникацией через **SignalR**
- Сложной доменной моделью (проекты, задачи, чаты, голосования, друзья)
- Аутентификацией и авторизацией по **JWT**
- Загрузкой файлов и раздачей статики
- Docker-контейнеризацией

### Демо-доступ

Чтобы не регистрироваться, используйте готовый аккаунт:

```
Email:    demo@[YOUR_DOMAIN]
Пароль:   demo1234
```

> Демо-данные периодически сбрасываются.

---

## Возможности

### Управление проектами
- Создание **публичных** и **приватных** проектов
- Роли участников: **Владелец**, **Администратор**, **Участник**
- Публичный код проекта (`ABC-123-DEF`) для быстрого присоединения
- **Обложки** проектов (PNG/JPG/GIF/WEBP до 5 МБ)
- **Теги** проектов (общие для всех, поиск по ним)
- **Дедлайны** и статусы (Uncompleted / Completed)
- **Архивация** и восстановление проектов
- **Избранное** — закладки на проекты
- Поиск по **коду**, **тегам** и **категории**

### Kanban-доска задач
- Настраиваемые **колонки** с весами прогресса
- Системные колонки «Не начато» / «В процессе» / «Завершено»
- **Задачи** с приоритетами (Low / Medium / High / Critical)
- **Подзадачи** с автопереходом задачи по колонкам
- **Вложения** (PDF, DOCX, XLSX, изображения, архивы — до 20 МБ)
- **Теги задач** и поиск по ним
- **Исполнители** (несколько на задачу)
- **Комментарии** с вложенными ответами
- Автоматический расчёт **прогресса** проекта
- **Таймлайн** задач по датам

### Коммуникации
- **Личные** и **проектные** чаты
- Отправка **текста**, **файлов** и **изображений**
- Отметки **прочитано** / **не прочитано**
- **Счётчики непрочитанных** сообщений
- **Emoji-пикер** с категориями и поиском
- **Real-time** доставка через SignalR
- **Приватность чатов**: «Все пользователи» / «Только друзья»

### Социальные функции
- **Друзья**: заявки, принятие, отклонение, удаление
- **Приватность онлайн-статуса**: All / FriendsOnly / Nobody
- **Профили пользователей** с аватарами и специализацией

### Голосования
- Одиночный и **множественный** выбор
- **Анонимные** голосования
- **Переголосование** (опционально)
- **Дедлайн** голосования
- Показ результатов **до** голосования (опционально)
- Список проголосовавших с аватарами

### Уведомления
- **In-app** уведомления с группировкой по типам
- **Настройки** каждого типа (вкл/выкл)
- **Режим «Не беспокоить»** (час / до утра / день / неделя)
- **Автоматические напоминания** о дедлайнах (фоновый воркер)
- **Real-time** доставка в открытые вкладки

### Заметки
- **Личные** заметки
- **Привязанные** к проекту
- Цвета, закрепление, поиск

### История проекта
- Полный лог действий участников
- Фильтрация по типу события
- Ссылки на связанные сущности

---

## Технологии

### Backend
| Технология | Версия | Назначение |
|---|---|---|
| **.NET** | 10.0 | Web API |
| **ASP.NET Core** | 10.0 | HTTP-фреймворк |
| **Entity Framework Core** | 10.0.11 | ORM |
| **Npgsql.EntityFrameworkCore.PostgreSQL** | 10.0.3 | Провайдер PostgreSQL |
| **PostgreSQL** | 16 | База данных |
| **SignalR** | (встроен в ASP.NET Core) | WebSocket для real-time |
| **Microsoft.AspNetCore.Authentication.JwtBearer** | 10.0.11 | JWT-аутентификация |
| **BCrypt.Net-Next** | 4.2.0 | Хеширование паролей |
| **Serilog.AspNetCore** | 10.0.0 | Логирование |
| **Serilog.Sinks.File** | 7.0.0 | Запись логов в файл |
| **Swashbuckle.AspNetCore** | 10.2.3 | Swagger / OpenAPI |

### Frontend
| Технология | Версия | Назначение |
|---|---|---|
| **React** | 18.2 | UI-библиотека |
| **React DOM** | 18.2 | Рендеринг |
| **React Router** | 7.18 | Маршрутизация |
| **@microsoft/signalr** | 8.0.7 | Клиент SignalR |
| **Lucide React** | 0.460 | Иконки |
| **React Scripts (CRA)** | 5.0.1 | Сборщик |
| **CSS** | — | Стилизация (без UI-фреймворков) |

### DevOps
| Технология | Назначение |
|---|---|
| **Docker** | Контейнеризация |
| **Docker Compose** | Оркестрация |
| **Nginx** | Reverse proxy + SPA |
| **Caddy** | HTTPS (Let's Encrypt) |
| **GitHub Actions** | CI (сборка) |

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                        Клиент (браузер)                     │
│          React + CRA + SignalR Client (WebSocket)           │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTPS
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx / Caddy (reverse proxy)            │
│           Сдаёт статику, проксирует /api и /hubs            │
└──────────────────┬──────────────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
┌──────────────┐       ┌──────────────────┐
│  REST API    │       │   SignalR Hub    │
│ Controllers  │       │  /hubs/chat      │
└──────┬───────┘       └────────┬─────────┘
       │                        │
       ▼                        ▼
┌──────────────────────────────────────────┐
│           Services Layer                 │
│  Projects / Tasks / Chats / Votings      │
│  Notifications / Friends / Activities    │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│         Entity Framework Core            │
│              AppDbContext                │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│            PostgreSQL 16                 │
└──────────────────────────────────────────┘
```

### Структура репозитория

```
projecthub/
├── ProjectHub.API/              # Backend (.NET 10)
│   ├── Controllers/
│   ├── Services/
│   ├── Models/
│   ├── DTOs/
│   ├── Data/
│   ├── Hubs/
│   ├── Migrations/
│   ├── App_Data/uploads/        # (не в git)
│   ├── Dockerfile
│   └── Program.cs
│
├── projecthub.client/           # Frontend (React + CRA)
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── utils/
│   │   └── styles/
│   ├── public/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docs/
│   └── screenshots/
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

---

## Скриншоты

### Главная — список проектов
![Список проектов](docs/screenshots/01-projects-list.png)

### Дашборд проекта
![Дашборд проекта](docs/screenshots/02-project-dashboard.png)

### Kanban-доска задач
![Kanban-доска](docs/screenshots/03-kanban.png)

### Карточка задачи
![Карточка задачи](docs/screenshots/04-task-details.png)

### Чат проекта
![Чат](docs/screenshots/05-chat.png)

### Голосование с результатами
![Голосование](docs/screenshots/06-voting.png)

### Профиль пользователя
![Профиль](docs/screenshots/07-profile.png)

### Уведомления
![Уведомления](docs/screenshots/08-notifications.png)

---

## Быстрый старт

### Через Docker (рекомендуется)

**Требования:** Docker Desktop (или Docker Engine + Compose Plugin).

```bash
git clone https://github.com/[YOUR_USERNAME]/projecthub.git
cd projecthub

cp .env.example .env
# откройте .env и задайте DB_PASSWORD и JWT_SECRET

docker compose up --build
```

Через минуту приложение будет доступно:

- Frontend: http://localhost:3000
- API: http://localhost:8080/api
- Swagger: http://localhost:8080/swagger

### Локальный запуск (без Docker)

**Требования:**
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org)
- [PostgreSQL 16](https://www.postgresql.org/download/)

#### 1. База данных

```bash
psql -U postgres -c "CREATE DATABASE projecthub;"
```

#### 2. Backend

```bash
cd ProjectHub.API

# Настройте секреты (вне репозитория)
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=projecthub;Username=postgres;Password=YOUR_DB_PASSWORD"
dotnet user-secrets set "Jwt:Secret" "YOUR_SECRET_MIN_32_CHARS_LONG"

# Примените миграции
dotnet ef database update

# Запустите
dotnet run
```

Backend: https://localhost:7000  
Swagger: https://localhost:7000/swagger

#### 3. Frontend

В **новом** терминале:

```bash
cd projecthub.client
npm install
npm start
```

Frontend: http://localhost:3000

---

## Конфигурация

Все секреты хранятся **вне репозитория**.

### Локально — `user-secrets`

```bash
cd ProjectHub.API
dotnet user-secrets set "Jwt:Secret" "..."
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "..."
```

Файл секретов лежит в `%APPDATA%\Microsoft\UserSecrets\<id>\secrets.json` (Windows) — **вне** папки проекта.

### Переменные окружения фронта (CRA)

CRA читает `.env` файлы с префиксом **`REACT_APP_`**:

```bash
# projecthub.client/.env
REACT_APP_API_URL=https://localhost:7000/api
REACT_APP_HUB_URL=https://localhost:7000/hubs/chat
```

> CRA **не** подхватывает переменные без префикса `REACT_APP_`.

### В Docker — через `.env`

```bash
cp .env.example .env
```

Заполни `DB_PASSWORD` и `JWT_SECRET`.

### На сервере — через переменные окружения

```bash
export Jwt__Secret="..."
export ConnectionStrings__DefaultConnection="..."
```

> Двойное подчёркивание `__` — разделитель вложенных ключей в env.

---

## Безопасность

- Пароли хешируются **BCrypt** (cost factor 11)
- **JWT** с истечением 3 дня
- Проверка прав **на каждом эндпоинте** (Owner / Admin / Member)
- Защита от race condition:
  - Уникальные индексы в БД (заявки, приглашения)
  - In-memory семафоры на пары `(sender, receiver)` и `(project, invitee)`
- Загрузка файлов: whitelist расширений, лимит размера, проверка прав
- Приватность чата и онлайн-статуса
- CORS — только явные origin

---

## Roadmap

- [x] Управление проектами
- [x] Kanban-доска
- [x] Подзадачи и комментарии
- [x] Чаты в реальном времени (SignalR)
- [x] Голосования
- [x] Уведомления и настройки DND
- [x] Друзья и заявки
- [x] История проекта
- [x] Заметки
- [x] Docker-контейнеризация
- [ ] Email-уведомления (SMTP)
- [ ] Восстановление пароля по email
- [ ] Экспорт проектов в PDF

---

## Контрибьютинг

Это учебный/портфолио проект. Открывайте [Issue](https://github.com/[YOUR_USERNAME]/projecthub/issues) или Pull Request.

Перед PR:

```bash
# Backend
cd ProjectHub.API
dotnet build

# Frontend
cd projecthub.client
npm run build
```

---

## Лицензия

Под лицензией **MIT**. Смотрите файл [LICENSE](LICENSE).

---

## Автор

**[YOUR_NAME]**

- GitHub: [@maglerg](https://github.com/maglerg])
- Email: [barabybluk@gmail.com]

---

## Благодарности

- [Lucide](https://lucide.dev) — за иконки
- [Shields.io](https://shields.io) — за бейджи
- Вдохновение: Trello, Notion, Linear

---

<p align="center">
  <sub>Сделано  на .NET 10 и React</sub>
</p>