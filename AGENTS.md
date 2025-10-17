# Repository Guidelines

## Project Structure & Module Organization
- Nx monorepo anchors the React client in `frontend/` and the Django Channels API in `api/`.
- `frontend/src` stores feature modules and UI primitives; shared styling lives in `tailwind.config.js` and static assets in `frontend/public/`.
- Django domains are split under `api/apps/accounts` and `api/apps/chat`; global settings and ASGI entry points sit in `api/config/`.
- Container infrastructure (`docker-compose.yaml`, `nginx/`, `postgres/`) provisions Postgres + Redis backing services and the reverse proxy; media uploads persist in `api/media/`.

## Build, Test, and Development Commands
- `npm run install` hydrates every workspace; use `npm run install:frontend` or `npm run install:api` for targeted setup.
- `npm run dev` starts Vite on the client and boots the API stack through Nx; `npm run dev:frontend` or `npm run dev:api` isolate service loops.
- `npm run docker:up` brings up Postgres, Redis, and the API; follow schema changes with `npm run migrate` (calls `manage.py migrate` in the container).
- `npm run build` compiles both projects; `npm run docker:down` tears down local services and volumes via `npm run docker:clean`.

## Coding Style & Naming Conventions
- Frontend TypeScript is formatted by Prettier and linted with ESLint; stick to 2-space indentation, PascalCase components (`ChatSidebar.tsx`), camelCase utilities, and colocate Tailwind tokens in `frontend/constants/`.
- Backend code adheres to Black (88 characters) and Ruff; modules remain snake_case (`chat/serializers.py`), classes TitleCase, Django settings in `.envs` only.
- Prefer descriptive Nx target names when adding scripts to `project.json`.

## Testing Guidelines
- Frontend tests use Vitest; store specs beside code as `*.test.tsx` and run `npx nx run frontend:test` (watch) or `npm run test:coverage` for CI.
- Backend reliability is covered by Pytest; add modules inside each app’s `tests/` package (or expand `tests.py`) and execute `npx nx run api:test` or `npx nx run api:test-coverage`.
- Aim to exercise realtime flows (WebSocket consumers, Redux slices) and document any required fixtures in the PR.

## Commit & Pull Request Guidelines
- Keep commits focused and imperative (`Add implicitDependencies`, `Restructure chat reducer`); square them with the Nx target you touched.
- PRs should outline scope, linked issues, migration or docker steps, and attach UI screenshots or API contract diffs where relevant.
- Before requesting review, ensure `npm run lint`, `npx nx run api:format-check`, and the appropriate test commands pass locally.
