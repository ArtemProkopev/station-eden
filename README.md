# Station Eden

Модульная платформа, состоящая из серверного приложения (NestJS API), клиентского веб-интерфейса (Next.js) и дополнительных пакетов, включая генератор имён на Rust/WASM.

---

## Requirements

Для корректной работы требуется:

1. **Node.js ≥ 18**
2. **pnpm ≥ 9**
3. **Rust & Cargo** (для сборки WASM)
4. **wasm-bindgen-cli**

   ```bash
   cargo install wasm-bindgen-cli
   ```
5. **Docker Compose** (для контейнерного запуска)
6. Настроенные `.env` файлы

---

## Branches

Непосредственный запуск любых веток поддерживается, однако рекомендуется работать только со стабильными и staging-ветками.

| branch type      | branch name | description                          |
| ---------------- | ----------- | ------------------------------------ |
| stable           | `main`      | Основная стабильная ветка проекта.   |
| development      | `dev`   | Основная ветка активной разработки.  |
| feature branches | `feature/*` | Ветки разработки отдельных функций.  |
| staging          | `release/*` | Используются перед выпуском релизов. |

---

## Workspace structure

Проект состоит из нескольких пакетов, организованных через pnpm workspaces:

| package            | path                          | description                                                 |
| ------------------ | ----------------------------- | ----------------------------------------------------------- |
| API                | `apps/api`                    | Backend (NestJS), авторизация, лобби, база данных           |
| Web                | `apps/web`                    | Next.js приложение, интерфейсы, компоненты, WASM интеграция |
| Shared             | `packages/shared`             | Общие типы, утилиты                                         |
| Username Generator | `packages/username-generator` | Rust/WASM генератор случайных имён                          |

---

## Environment Setup

Перед запуском необходимо создать файлы окружения:

```
.env
apps/api/.env.local
apps/web/.env.local
```

## Installation

Установка зависимостей выполняется в корне:

```bash
pnpm i
```

pnpm автоматически установит зависимости всех workspace-пакетов.

---

## Database Migrations

Для применения миграций используйте:

```bash
pnpm migrate:run
```

Откат миграций:

```bash
pnpm migrate:revert
```

---

## Building

### Полная сборка проекта

```bash
pnpm build
```

### Сборка WASM модуля

```bash
pnpm build:wasm
```

Собранные артефакты попадут в:

```
apps/web/public/wasm
```

---

## Development

Для разработки доступны следующие команды:

| command            | description                          |
| ------------------ | ------------------------------------ |
| `pnpm dev`         | Запуск API + Web в общем dev-режиме  |
| `pnpm dev:nocache` | То же, но с отключением кэша Next.js |
| `pnpm dev:web`     | Запуск только веб-клиента            |
| `pnpm dev:api`     | Запуск только API                    |

### Примечание

Команда `dev:api` использует локальный `.env.local`:

```bash
dotenv -e apps/api/.env.local -- pnpm --filter @station-eden/api start:dev
```

---

## Cleaning

| command                | description                          |
| ---------------------- | ------------------------------------ |
| `pnpm clean:artifacts` | Удаление артефактов сборки           |
| `pnpm clean`           | Полная очистка, включая node_modules |

---

## Running with Docker

Для контейнерного запуска:

```bash
docker compose up -d
```

---

## Contributing

Pull-requests приветствуются. Перед отправкой убедитесь, что:

* код проходит линтинг,
* миграции корректно применяются,
* сборка WASM проходит успешно,
* API и Web успешно запускаются в dev-режиме.
