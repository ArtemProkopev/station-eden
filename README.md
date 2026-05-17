# Station Eden

Браузерная многопользовательская игра с авторизацией, лобби, игровой логикой и real-time взаимодействием через WebSocket.

## Стек

| Часть          | Технологии                                  |
| -------------- | ------------------------------------------- |
| Backend        | NestJS, TypeORM, PostgreSQL, Socket.IO, JWT |
| Frontend       | Next.js, React, Socket.IO Client            |
| Shared         | TypeScript, Zod                             |
| Infrastructure | Docker Compose, Caddy, GitHub Actions       |

## Структура проекта

```text
station-eden/
├── apps/
│   ├── api/              # серверная часть
│   └── web/              # клиентская часть
├── packages/
│   └── shared/           # общие типы и схемы
├── scripts/              # служебные скрипты
├── docker-compose.yml
├── docker-compose.override.yml
├── Caddyfile
├── package.json
└── pnpm-workspace.yaml
```

## Требования

| Инструмент     | Версия            |
| -------------- | ----------------- |
| Node.js        | 20 LTS            |
| pnpm           | 10.30.1           |
| Docker Compose | актуальная версия |
| Git            | актуальная версия |

PostgreSQL отдельно устанавливать не нужно: для локального запуска база поднимается через Docker Compose.

Включить нужную версию pnpm:

```bash
corepack enable
corepack prepare pnpm@10.30.1 --activate
```

Проверить версии:

```bash
node -v
pnpm -v
docker compose version
git --version
```

## Файлы окружения

Для запуска проекта нужны локальные файлы окружения:

```text
apps/api/.env.local
apps/web/.env.local
```

Файлы окружения не хранятся в репозитории. Чтобы проект работал, их нужно скопировать из рабочей копии проекта или получить у разработчика.

Для полного Docker-запуска дополнительно используется файл:

```text
.env
```

## Быстрый запуск

```bash
git clone https://github.com/ArtemProkopev/station-eden.git
cd station-eden

corepack enable
corepack prepare pnpm@10.30.1 --activate

pnpm install
docker compose up -d postgres
pnpm migrate:run
pnpm dev
```

Перед запуском `pnpm dev` должны быть добавлены файлы окружения:

```text
apps/api/.env.local
apps/web/.env.local
```

После запуска:

| Сервис | Адрес                   |
| ------ | ----------------------- |
| Web    | `http://localhost:3000` |
| API    | `http://localhost:4000` |

## База данных

Запустить PostgreSQL:

```bash
docker compose up -d postgres
```

Проверить контейнеры:

```bash
docker compose ps
```

Остановить PostgreSQL:

```bash
docker compose stop postgres
```

Остановить контейнеры и удалить данные базы:

```bash
docker compose down -v
```

## Миграции

Применить миграции:

```bash
pnpm migrate:run
```

Откатить последнюю миграцию:

```bash
pnpm migrate:revert
```

## Разработка

Запуск API и Web вместе:

```bash
pnpm dev
```

Запуск только API:

```bash
pnpm dev:api
```

Запуск только Web:

```bash
pnpm dev:web
```

Запуск без кэша Next.js:

```bash
pnpm dev:nocache
```

## Сборка

Собрать проект:

```bash
pnpm build
```

## Проверки

E2E-тесты API:

```bash
pnpm --filter @station-eden/api test:e2e
```

Проверка проекта:

```bash
pnpm check
```

Полная CI-проверка:

```bash
pnpm ci
```

## Docker

Для локальной разработки обычно достаточно поднять только PostgreSQL:

```bash
docker compose up -d postgres
pnpm dev
```

Полный запуск через Docker:

```bash
docker compose up --build
```

Запуск в фоне:

```bash
docker compose up --build -d
```

Просмотр логов:

```bash
docker compose logs -f
```

Остановка контейнеров:

```bash
docker compose down
```

Остановка с удалением данных PostgreSQL:

```bash
docker compose down -v
```

## Команды

| Команда                                    | Назначение                        |
| ------------------------------------------ | --------------------------------- |
| `pnpm install`                             | установка зависимостей            |
| `pnpm dev`                                 | запуск API и Web                  |
| `pnpm dev:api`                             | запуск только API                 |
| `pnpm dev:web`                             | запуск только Web                 |
| `pnpm dev:nocache`                         | запуск без кэша Next.js           |
| `pnpm build`                               | сборка проекта                    |
| `pnpm migrate:run`                         | применение миграций               |
| `pnpm migrate:revert`                      | откат последней миграции          |
| `pnpm --filter @station-eden/api test:e2e` | E2E-тесты API                     |
| `pnpm check`                               | проверка проекта                  |
| `pnpm ci`                                  | полная CI-проверка                |
| `pnpm clean`                               | очистка зависимостей и артефактов |

## Частые проблемы

### Web не подключается к API

Проверьте, что API запущен:

```bash
curl http://localhost:4000/api/time
```

Также проверьте файл окружения клиента:

```text
apps/web/.env.local
```

### API не подключается к базе

Проверьте PostgreSQL:

```bash
docker compose ps postgres
```

Если база не запущена:

```bash
docker compose up -d postgres
```

### Миграции не применяются

Запустите миграции вручную:

```bash
pnpm migrate:run
```

Если локальная база повреждена, пересоздайте её:

```bash
docker compose down -v
docker compose up -d postgres
pnpm migrate:run
```

### Зависимости работают некорректно

```bash
pnpm clean
pnpm install
```
