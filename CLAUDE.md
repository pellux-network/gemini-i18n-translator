# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An i18n translation tool using Google's Gemini API to translate JSON locale files. Provides two interfaces: an interactive TUI (Ink/React) and a non-interactive CLI for CI pipelines. Runtime is **Bun**.

## Commands

```bash
bun start                # Run TUI interactively
bun run cli -- -i ./locales/en -o ./locales -l fr,de,ja  # Run CLI mode
bun test                 # Run all tests (Bun test runner)
bun test tests/lib/validate.test.ts  # Run a single test file
```

No build step — Bun JIT compiles TypeScript directly. No linter configured.

## Architecture

### Dual Entry Points

- **`src/index.tsx`** — TUI entry. Renders React App via Ink, patches console to prevent terminal corruption.
- **`src/cli.ts`** — CLI entry. Uses `parseArgs`, direct file I/O, no UI dependencies.

### Layer Separation

- **`src/lib/`** — Pure business logic, no UI dependencies. Fully testable.
  - `translate.ts` — `translateJson()` (CLI) and `translateJsonStream()` (TUI) with retry-on-validation-failure (max 1 retry)
  - `validate.ts` — `parseAndValidate()` strips markdown fences, parses JSON, validates key structure via dotted-path comparison
  - `language.ts` — `normalizeBCP47()`, `getLanguageName()`, `isValidBCP47()` — BCP 47 validation/normalization via `Intl.Locale` and `Intl.DisplayNames`
  - `prompt.ts` — Builds system/user/retry prompts; uses `language.ts` for language name resolution
  - `logger.ts` — Pino structured logger writing to `~/.local/share/gemini-i18n-translator/logs/`

- **`src/ui/`** — Ink (React for CLI) components. Step-based wizard state machine:
  ```
  config → input → output → lang → confirm → translating → done
  ```
  - `App.tsx` — Main state machine orchestrator
  - `steps/` — One component per wizard step
  - `views/` — TranslationView (live progress grid + streaming output) and DoneView (results + retry)
  - `components/` — Reusable: Divider, PathInput (with tab-completion)

### Translation Pipeline

Files × languages → job queue → parallel execution (concurrency 5 via Promise.race) → per-job: read source JSON → Gemini API call → validate key structure → write output. Validation failures trigger one retry with error context in prompt.

## Testing

Tests live in `tests/lib/` and cover core logic only (no UI tests). They mock the Gemini model. Fixtures are in `tests/fixtures/en/`.

## Environment

Requires `GEMINI_API_KEY` in `.env`. Optional `GEMINI_MODEL` (defaults to `gemini-flash-lite-latest`).
