# CLAUDE.md

This file defines how the AI coding assistant (Claude Code) works in this repository. The developer owns every technical decision. The assistant proposes, implements under review, and verifies; it never acts on its own initiative outside the agreed scope.

## Project context

A small Task Manager web app built as a take-home assignment. Requirements:

- Backend (Node.js): `POST /tasks` adds a task `{ id, title, status }`; `GET /tasks` lists all tasks.
- Frontend (Vue + Tailwind): a form to add a task, a task list showing title and status, responsive on mobile and desktop.
- Bonus: a "Mark as Completed" feature.

The codebase will be reviewed and walked through live in a technical interview. Every line must be easy to read and easy to explain. Prefer clear over clever.

## Engineering principles

- **SOLID**: one responsibility per module, depend on abstractions at layer boundaries (the service depends on a repository interface, not on a concrete store), keep interfaces small and shaped by their consumers.
- **DRY**: one source of truth for each rule, type, and constant. Do not duplicate validation, status values, or error formatting.
- **KISS and YAGNI**: DRY is not a license for premature abstraction. Build what the spec needs, structured so it can grow; do not build the growth itself.
- **Separation of concerns**: HTTP, business logic, data access, UI, and API calls each live in their own layer.
- **Fail loudly at the boundaries**: validate all external input (request bodies, route params, environment variables) where it enters the system.

## Stack

- Monorepo with npm workspaces: `backend/` and `frontend/`. All scripts run from the repository root.
- Node.js 24 LTS. TypeScript with `strict` mode in both workspaces.
- Backend: Express 5, Zod for validation, in-memory persistence. Tests: Vitest + Supertest.
- Frontend: Vue 3 with Composition API and `<script setup lang="ts">`, Vite, Tailwind CSS v4 via `@tailwindcss/vite`. Tests: Vitest + Vue Test Utils.
- Tooling: ESLint + Prettier.

Do not add dependencies beyond this list without asking first and stating why the platform or an existing dependency cannot do the job.

## Backend architecture

Layers, each with a single responsibility:

- `routes`: map HTTP verbs and paths to controller handlers. Nothing else.
- `controllers`: parse and validate input, call the service, shape the HTTP response.
- `services`: business rules (default status, status transitions, not-found handling).
- `repositories`: data access behind a `TaskRepository` interface. `InMemoryTaskRepository` is the only implementation. Swapping it for a database must not require touching services or controllers.
- `app.ts` exposes a `createApp` factory that receives its dependencies (composition root), so tests build an isolated app with a fresh repository. `server.ts` only reads config and starts listening.

API contract:

- Endpoints are exactly `POST /tasks` and `GET /tasks` as specified, plus `PATCH /tasks/:id` for the bonus. No path prefix.
- `id` is generated server side with `crypto.randomUUID()`. Clients never send it.
- `status` is `"pending" | "completed"`, defined once and reused by the validation schema and the types. New tasks default to `"pending"`.
- `title` is trimmed and must be non-empty, with a sensible maximum length.
- Status codes: `201` with the created task on create, `200` on list and update, `400` on invalid input, `404` on unknown id.

Errors:

- A single error-handling middleware produces one consistent JSON error shape for every failure.
- Never expose stack traces or internal messages to the client. Validation errors return field-level details.

Configuration:

- Environment variables (port, allowed CORS origin) are read and validated once in a config module, with safe local defaults. No `process.env` reads anywhere else.
- CORS allows only the configured frontend origin.

## Frontend architecture

- `types/`: the `Task` type and status values, mirroring the API contract.
- `api/`: the only place that calls `fetch`. One function per endpoint, base URL taken from a Vite environment variable. Non-2xx responses become typed errors.
- `composables/useTasks.ts`: owns task state, loading, and error state, and exposes actions. Components never call the API directly.
- `components/`: small, single-purpose components (form, list, list item). Props down, events up.

UX and UI requirements:

- Mobile-first responsive layout with Tailwind utilities. No inline styles, no hard-coded colors outside the Tailwind theme.
- Every async state is handled visibly: loading, empty list, error, and submitting (button disabled, no double submit).
- Client-side validation mirrors the backend rules; the backend remains the source of truth.
- The UI updates from the server response, not optimistically.
- Accessibility: every input has a label, errors are announced with `aria-live`, focus states are visible, everything works with the keyboard, color is never the only status indicator.

## Testing

- Backend: integration tests with Supertest against `createApp` (a fresh repository per test) for every endpoint, covering success, validation failure, and not-found paths. Unit tests for service rules.
- Frontend: component tests for the form (validation, submit, disabled state) and the list (rendering, empty state, status display), and tests for the composable with the API module mocked.
- Test observable behavior, not implementation details or CSS classes.
- Never weaken or delete a test to make it pass. If a test fails, decide whether the expectation or the code is wrong, and fix the one that is wrong.

## Code style

- Small functions with descriptive names. Explicit return types on exported functions. No `any`.
- Comments explain why, not what. No commented-out code, no leftover `console.log`.
- No column alignment with extra spaces.
- Constants for magic values.
- All npm scripts must work on Windows (PowerShell) as well as macOS and Linux. No POSIX-only commands in scripts.

## Workflow rules for the assistant

1. **Plan first.** For anything beyond a trivial edit, present a short plan (files to create or change, and why) and wait for approval before writing code.
2. **Read before modifying.** Read the current version of a file before changing it. Do not modify files outside the scope of the current task.
3. **Scope discipline.** Implement what the current task asks for. Suggest extras separately; do not build them unasked.
4. **Do not invent identifiers.** No made-up file paths, scripts, environment variables, or endpoints. If something is unknown, ask.
5. **No git write operations.** Never run `git add`, `git commit`, `git push`, `git checkout`, `git reset`, `git rebase`, or any other command that changes repository history or the working tree state through git. The developer handles all git operations. Read-only commands (`git status`, `git diff`, `git log`) are allowed.
6. **No AI attribution.** Never mention the assistant or any AI tool in code, comments, commit messages, file names, or generated docs. AI usage is documented only by the developer, in the README.
7. **English only** in code, comments, identifiers, UI text, and docs.
8. **Verification gate.** Before reporting a task as finished, run from the repository root: lint, type check, tests, and build. All must pass. Report the actual results.
9. **Honest status.** Never say "done", "working", or "fixed" unless the output proves it. When unsure, say "pending verification".
10. **Report, do not hide.** If you notice an inconsistency, a bug outside the current task, or a convention violation, report it. Do not silently fix it and do not ignore it.
11. **Side-effects scan.** At the end of each task, list the files changed and check for dead code, unused imports or dependencies, broken references, and contract changes that the other workspace has not picked up.
