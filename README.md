# gemini-i18n-translator

<p align="center">
  <img src="logo.svg" alt="gemini-i18n-translator" width="200" />
</p>

Translate your i18n JSON files into any language using Google's Gemini API. Point it at a directory of English JSON files, pick your target languages, and it handles the rest -- parallel API calls, structural validation, and automatic directory generation.

Comes with two modes: an **interactive TUI** with live streaming output, and a **non-interactive CLI** for scripting and CI.

## Requirements

- [Bun](https://bun.sh) v1.0+
- A [Google AI API key](https://aistudio.google.com/apikey) with access to Gemini models

## Setup

```bash
git clone <repo-url>
cd gemini-i18n-translator
bun install
```

Copy the example environment file and fill in your API key:

```bash
cp .env.example .env
```

Then edit `.env` and add your key. Bun automatically loads `.env` at runtime.

### Global install

To use it as a system-wide command:

```bash
bun link
```

Then run `gemini-i18n-translator` from anywhere.

> **Important:** Bun loads `.env` relative to your current working directory, not the install location. When running globally, you have two options:
>
> 1. Place a `.env` file in whatever directory you run the command from
> 2. Export the variables in your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):
>    ```bash
>    export GEMINI_API_KEY=your-api-key-here
>    export GEMINI_MODEL=gemini-flash-lite-latest  # optional
>    ```

## Usage

### Interactive TUI (default)

```bash
bun start
# or
gemini-i18n-translator
```

The TUI walks you through each step:

1. **Config check** -- displays your API key (masked) and model
2. **Source directory** -- path to your English JSON files (tab-completion supported)
3. **Output directory** -- base path where language subdirectories are created
4. **Target languages** -- comma-separated language codes with BCP-47 validation (e.g. `fr,de,ja`)
5. **Confirmation** -- review summary with job breakdown (new / incremental / up to date), press `Y` to start
6. **Stale keys** -- if existing translations have keys no longer in source, lists them for confirmation before removal
7. **Translation** -- live progress bar, per-file status grid with incremental indicators, and streaming Gemini output
8. **Results** -- success/failure/up-to-date summary with option to retry failed translations

### Non-interactive CLI

For scripting, CI pipelines, or when you just want a one-liner:

```bash
bun run cli -- -i ./locales/en -o ./locales -l fr,de,ja
```

Options:

| Flag | Short | Required | Default | Description |
|------|-------|----------|---------|-------------|
| `--input` | `-i` | Yes | -- | Path to English source directory |
| `--output` | `-o` | Yes | -- | Base output directory |
| `--lang` | `-l` | Yes | -- | Comma-separated target language codes |
| `--model` | `-m` | No | `gemini-flash-lite-latest` | Gemini model to use |
| `--no-scan` | | No | `false` | Skip pre-scan of existing translations |
| `--no-retry` | | No | `false` | Disable automatic retry of failed jobs |
| `--skip-validation` | | No | `false` | Skip BCP-47 language code validation |
| `--help` | `-h` | No | -- | Show help |

Example CI/CD usage:

```bash
# Full run with all features (pre-scan, retry, validation)
bun run cli -- -i ./locales/en -o ./locales -l fr,de,ja

# Fast mode: skip pre-scan, no retry
bun run cli -- -i ./locales/en -o ./locales -l fr,de,ja --no-scan --no-retry
```

## Incremental translation

When output files already exist, only new or missing keys are sent to Gemini. Existing translations are preserved and reused. This means:

- **Adding new keys** to your source JSON only translates the new keys -- existing translations are untouched
- **Removing keys** from source automatically drops them from all translations (with a confirmation step in TUI mode)
- **Up-to-date files** are skipped entirely -- no API calls, just reordered to match source key order

Both CLI and TUI show a breakdown before starting: how many jobs are new, incremental updates, or already up to date. The CLI pre-scan can be skipped with `--no-scan` for speed.

## Output structure

Given a source directory with `common.json` and `search.json`, translating to French and German:

```
<output>/
  fr/
    common.json
    search.json
  de/
    common.json
    search.json
```

Language subdirectories are created automatically. The translated files preserve the exact same key structure, nesting, and formatting as the source.

## What gets preserved

The translator is designed for real-world i18n files. It preserves:

- **JSON keys** -- only values are translated, keys stay in English
- **Interpolation placeholders** -- `{count}`, `{name}`, `{query}` etc. are kept verbatim
- **Plural separators** -- pipe-delimited plurals like `"No results | {count} result | {count} results"` maintain their structure
- **Nesting** -- deeply nested objects come back with the same hierarchy

## Supported languages

Any language code works (Gemini handles the mapping), but these have explicit name mappings for better prompt quality:

`af` `ar` `bg` `bn` `ca` `cs` `da` `de` `el` `es` `et` `fa` `fi` `fr` `gu` `he` `hi` `hr` `hu` `id` `it` `ja` `ka` `kn` `ko` `lt` `lv` `ml` `mr` `ms` `nb` `nl` `pl` `pt` `pt-BR` `ro` `ru` `sk` `sl` `sr` `sv` `ta` `te` `th` `tr` `uk` `ur` `vi` `zh` `zh-TW`

## Gemini models

The default model is `gemini-flash-lite-latest` which is fast and cheap. You can use any Gemini model by setting `GEMINI_MODEL` in `.env` or passing `--model` in CLI mode:

```bash
# In .env
GEMINI_MODEL=gemini-2.5-flash

# Or via CLI
bun run cli -- -i ./locales/en -o ./locales -l fr -m gemini-2.5-flash
```

## Validation and retries

Every translation response is validated:

1. The response is parsed as JSON (markdown code fences are stripped if present)
2. The key structure is compared against the source -- missing or extra keys cause a validation failure
3. On failure, the translator retries once with the specific error included in the prompt so Gemini can self-correct
4. In TUI mode, persistent failures are shown with full error details and you can retry interactively

## Logging

Structured JSON logs are written to the `logs/` directory (one file per run, rolling 10 files). Logs capture:

- Session start/end
- Configuration details
- Each translation: start, stream progress, validation result
- Errors with full context (file, language, attempt number, error message)
- Retries with prior error context

Useful for debugging translation failures or tracking API usage. The `logs/` directory is gitignored.

## Project structure

```
src/
  index.tsx              -- TUI entry point
  cli.ts                 -- non-interactive CLI entry point
  lib/                   -- core logic (no UI dependencies)
    diff.ts              -- incremental translation diffing and merging
    language.ts          -- BCP-47 validation and normalization
    logger.ts            -- pino logger with rolling file output
    prompt.ts            -- Gemini prompt construction
    translate.ts         -- translation with streaming and retry
    validate.ts          -- JSON structure validation
  ui/                    -- Ink (React for CLI) components
    App.tsx              -- step-based state machine
    components/          -- reusable UI (Divider, PathInput)
    hooks/               -- React hooks (usePathSuggestions)
    steps/               -- wizard step components
    views/               -- TranslationView, DoneView
tests/
  lib/                   -- unit tests for core logic
  fixtures/              -- test JSON files
```

## Development

```bash
# Run tests
bun test

# Run TUI in development
bun start

# Run CLI in development
bun run cli -- -i ./tests/fixtures/en -o /tmp/test-output -l fr,es
```

## License

MIT
