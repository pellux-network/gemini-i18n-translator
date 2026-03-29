# gemini-i18n-translator — Design Spec

## Overview

A CLI utility that translates i18n JSON files from English to one or more target languages using Google's Gemini API. Built with Bun and TypeScript. Designed as a single command that handles all file discovery, API calls, and output directory generation.

## Usage

```bash
gemini-i18n-translator --input ./locales/en --output ./locales --lang fr,de,ja
```

### CLI Arguments

| Flag | Short | Required | Default | Description |
|------|-------|----------|---------|-------------|
| `--input` | `-i` | Yes | — | Path to English source directory containing JSON files |
| `--output` | `-o` | Yes | — | Base output directory (language subdirs created automatically) |
| `--lang` | `-l` | Yes | — | Comma-separated target language codes (e.g. `fr,de,ja`) |
| `--model` | `-m` | No | `gemini-2.0-flash-lite` | Gemini model to use |

### Environment

- `GEMINI_API_KEY` — required. Google AI API key for Gemini access.

## Architecture

Single-file CLI entry point (`src/index.ts`) with a few focused modules:

```
src/
  index.ts          — CLI entry point (commander setup, orchestration)
  translate.ts      — Gemini API call logic (send JSON, get translated JSON back)
  prompt.ts         — System/user prompt construction
  validate.ts       — Response validation (JSON parse, key matching)
```

### Flow

1. Parse CLI args, validate inputs, check for API key
2. Glob all `*.json` files from `--input` directory
3. For each file x each target language:
   a. Read the source JSON
   b. Send to Gemini with translation prompt
   c. Parse and validate the response JSON
   d. Write to `<output>/<lang>/<filename>.json`
4. Print progress to console as each file completes

### Concurrency

Process files with a concurrency limit (5 parallel requests) to avoid rate limiting. Each file/language pair is an independent unit of work.

### Translation Prompt

The prompt instructs Gemini to:
- Translate all JSON values from English to the target language
- Preserve all JSON keys exactly as-is
- Preserve `{variable}` interpolation placeholders verbatim
- Preserve `|` pipe-delimited plural separators and their structure
- Return only valid JSON, no markdown fencing or commentary

### Validation

After each Gemini response:
1. Strip any markdown code fences if present (defensive)
2. Parse as JSON
3. Verify the translated JSON has the same key structure as the source
4. On failure: retry once, then log an error and skip that file/language pair

### Output Structure

Given `--input ./locales/en` containing `search.json` and `common.json`, and `--lang fr,de`:

```
<output>/
  fr/
    search.json
    common.json
  de/
    search.json
    common.json
```

### Progress Output

Simple console logging:
```
Translating 4 files to 3 languages (12 total)
[1/12] search.json -> fr ... done
[2/12] search.json -> de ... done
...
Complete: 12/12 succeeded, 0 failed
```

## Dependencies

- `@google/generative-ai` — Google's official Gemini SDK
- `commander` — CLI argument parsing
- Bun runtime (no Node.js)

## Non-Goals

- No file splitting or chunking (files are small enough to send whole)
- No caching or incremental translation
- No GUI or interactive mode
- No support for non-JSON formats
