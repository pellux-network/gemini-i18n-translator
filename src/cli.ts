#!/usr/bin/env bun
import { parseArgs } from "util";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readdir, readFile, mkdir, writeFile, access } from "fs/promises";
import { join, resolve } from "path";
import { translateJson } from "./lib/translate";
import { resolveIncremental, scanJobs } from "./lib/diff";
import { isValidBCP47, normalizeBCP47, getLanguageName } from "./lib/language";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    input: { type: "string", short: "i" },
    output: { type: "string", short: "o" },
    lang: { type: "string", short: "l" },
    model: { type: "string", short: "m", default: "gemini-flash-lite-latest" },
    "no-scan": { type: "boolean", default: false },
    "no-retry": { type: "boolean", default: false },
    "skip-validation": { type: "boolean", default: false },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
});

if (values.help) {
  console.log(`Usage: gemini-i18n-translator [options]

Translate i18n JSON files using Google Gemini (non-interactive mode)

Options:
  -i, --input <path>       Path to English source directory
  -o, --output <path>      Base output directory
  -l, --lang <codes>       Comma-separated target language codes
  -m, --model <name>       Gemini model (default: gemini-flash-lite-latest)
      --no-scan            Skip pre-scan of existing translations
      --no-retry           Disable automatic retry of failed jobs
      --skip-validation    Skip BCP-47 language code validation
  -h, --help               Show this help`);
  process.exit(0);
}

if (!values.input || !values.output || !values.lang) {
  console.error("Error: --input, --output, and --lang are required. Use --help for usage.");
  process.exit(1);
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY environment variable is required.");
  process.exit(1);
}

const inputDir = resolve(values.input);
const outputDir = resolve(values.output);
const modelName = values.model!;

// Feature 4: BCP-47 validation and normalization
let languages = values.lang.split(",").map((l) => l.trim());

if (!values["skip-validation"]) {
  const validated: string[] = [];
  for (const code of languages) {
    if (!isValidBCP47(code)) {
      console.error(`Error: Invalid language code "${code}". Use --skip-validation to bypass.`);
      process.exit(1);
    }
    const normalized = normalizeBCP47(code)!;
    if (normalized !== code) {
      console.log(`  Normalized "${code}" → "${normalized}" (${getLanguageName(normalized)})`);
    }
    validated.push(normalized);
  }
  languages = validated;
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: modelName });

const entries = await readdir(inputDir);
const jsonFiles = entries.filter((f) => f.endsWith(".json"));

if (jsonFiles.length === 0) {
  console.error(`No JSON files found in ${inputDir}`);
  process.exit(1);
}

const totalJobs = jsonFiles.length * languages.length;
console.log(
  `Translating ${jsonFiles.length} file(s) to ${languages.length} language(s) (${totalJobs} total)`
);

// Feature 1: Pre-scan summary
if (!values["no-scan"]) {
  const scan = await scanJobs(jsonFiles, languages, inputDir, outputDir);
  const parts: string[] = [];
  if (scan.newJobs > 0) parts.push(`${scan.newJobs} new`);
  if (scan.updateJobs > 0) parts.push(`${scan.updateJobs} incremental`);
  if (scan.upToDateJobs > 0) parts.push(`${scan.upToDateJobs} up to date`);
  if (scan.staleKeys.length > 0) {
    const staleCount = scan.staleKeys.reduce((s, k) => s + k.keys.length, 0);
    parts.push(`${staleCount} stale key(s) to remove`);
  }
  if (parts.length > 0) {
    console.log(`  Pre-scan: ${parts.join(", ")}`);
  }
}

console.log();

const allJobs: Array<{ file: string; lang: string }> = [];
for (const file of jsonFiles) {
  for (const lang of languages) {
    allJobs.push({ file, lang });
  }
}

const CONCURRENCY = 5;
let completed = 0;
let skipped = 0;
let failed = 0;
let failedJobs: Array<{ file: string; lang: string }> = [];

async function processJob(job: { file: string; lang: string }): Promise<void> {
  const { file, lang } = job;
  const label = `${file} -> ${lang}`;
  try {
    const sourcePath = join(inputDir, file);
    const raw = await readFile(sourcePath, "utf-8");
    const source = JSON.parse(raw);

    const existingPath = join(outputDir, lang, file);
    let existing: Record<string, unknown> | null = null;
    try {
      await access(existingPath);
      const existingRaw = await readFile(existingPath, "utf-8");
      existing = JSON.parse(existingRaw);
    } catch {
      // File doesn't exist — full translation needed
    }

    const { result: translated, skippedTranslation, staleKeys, missingKeys } = await resolveIncremental(
      source,
      existing,
      (subset) => translateJson(model, subset, lang)
    );

    if (staleKeys.size > 0) {
      console.warn(
        `  [warning] ${label}: dropping ${staleKeys.size} stale key(s): ${[...staleKeys].join(", ")}`
      );
    }

    const langDir = join(outputDir, lang);
    await mkdir(langDir, { recursive: true });
    await writeFile(
      join(langDir, file),
      JSON.stringify(translated, null, 2) + "\n",
      "utf-8"
    );

    // Feature 2 & 3: Distinct status messages with key counts
    const counter = completed + skipped + failed + 1;
    if (skippedTranslation && staleKeys.size > 0) {
      skipped++;
      console.log(`  [${counter}/${totalJobs}] ${label} ... updated (removed stale keys)`);
    } else if (skippedTranslation) {
      skipped++;
      console.log(`  [${counter}/${totalJobs}] ${label} ... up to date`);
    } else if (existing && missingKeys.size > 0) {
      completed++;
      console.log(`  [${counter}/${totalJobs}] ${label} ... done (${missingKeys.size} new keys)`);
    } else {
      completed++;
      console.log(`  [${counter}/${totalJobs}] ${label} ... done`);
    }
  } catch (err) {
    failed++;
    failedJobs.push(job);
    const msg = err instanceof Error ? err.message : String(err);
    const counter = completed + skipped + failed;
    console.error(
      `  [${counter}/${totalJobs}] ${label} ... FAILED: ${msg}`
    );
  }
}

async function runJobs(jobs: Array<{ file: string; lang: string }>): Promise<void> {
  const executing = new Set<Promise<void>>();
  for (const job of jobs) {
    const p = processJob(job).then(() => {
      executing.delete(p);
    });
    executing.add(p);
    if (executing.size >= CONCURRENCY) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}

await runJobs(allJobs);

// Feature 5: Retry failed jobs once
if (failedJobs.length > 0 && !values["no-retry"]) {
  const retryList = [...failedJobs];
  console.log(`\nRetrying ${retryList.length} failed job(s)...\n`);
  failed = 0;
  failedJobs = [];
  await runJobs(retryList);
}

// Feature 2: Summary distinguishes translated vs up-to-date
const parts: string[] = [];
if (completed > 0) parts.push(`${completed} translated`);
if (skipped > 0) parts.push(`${skipped} up to date`);
if (failed > 0) parts.push(`${failed} failed`);
console.log(`\nComplete: ${parts.join(", ")}`);

if (failed > 0) {
  process.exit(1);
}
