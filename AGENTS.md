# Repository Guidelines

## Project Structure & Module Organization
- `apps/` contains user-facing dashboards and CLIs; each app keeps its own `src/` and `__tests__/` folders.
- `packages/` holds shared libraries (UI components, data hooks, analytics helpers) consumed across apps.
- `services/` captures background workers and API adapters for cost ingestion and usage aggregation.
- `infra/` hosts Supabase migrations plus IaC scripts; `supabase/` mirrors seed data and local fixtures.
- `scripts/` bundles developer utilities (playbooks, smoke checks, data snapshots); `public/` serves static assets.
- Root Markdown files document deployment, MCP integration, and operational runbooks—review before major changes.

## Build, Test, and Development Commands
- `pnpm install` – install dependencies across all Turbo workspaces.
- `pnpm dev` – run `turbo run dev` to start dashboards, APIs, and workers concurrently.
- `pnpm build` – compile every workspace; ensure this passes before release branches.
- `pnpm lint` / `pnpm format:check` – validate style with Prettier-backed lint rules.
- `pnpm test`, `pnpm test:coverage` – execute unit suites with Vitest and collect coverage artifacts.
- `pnpm test:e2e` – launch Playwright end-to-end scenarios (uses `playwright.config.ts`).
- `pnpm db:migrate` – apply Supabase migrations from `infra/supabase`.

## Coding Style & Naming Conventions
- TypeScript is the default; favor strong typing and keep `any` behind TODOs.
- Prettier enforces 2-space indentation, single quotes, and trailing commas—run `pnpm format` before commits.
- Organize React components as `PascalCase.tsx`, hooks as `useName.ts`, and shared utilities under `packages/<domain>/src`.
- Follow module-aligned foldering (e.g., `apps/gac/src/metrics/UsageChart.tsx`).

## Testing Guidelines
- Unit and integration tests live beside source as `*.test.ts` or inside `__tests__`.
- E2E coverage uses Playwright specs in repo root and app-level `tests/` folders.
- Load testing scripts reside in `tests/load/` with k6; run only against staging targets.
- Target ≥80% coverage on core analytics packages; attach coverage diffs to reviews when introducing new modules.

## Commit & Pull Request Guidelines
- Write imperative, scope-aware commit titles (`Add usage breakdown table`, `Fix supabase client retry`); squash small fixes.
- Reference issues in the body (`Refs #123`) and note affected workspaces (`apps/gac`, `services/ingest`).
- Pull requests must summarize impact, list validation commands, and include screenshots or log excerpts for UI/metric changes.
- Ensure CI (build, lint, tests) passes before requesting review; draft PRs are encouraged for early feedback.

## Security & Configuration Tips
- Never commit real API keys—populate `.env.template` only with placeholders and document secrets in `HOW_TO_USE.md`.
- Keep Supabase migrations idempotent; test with `pnpm db:studio` locally before merging.
- Review MCP token handling guides under `/docs/` when modifying agent integrations to avoid leaking credentials.
