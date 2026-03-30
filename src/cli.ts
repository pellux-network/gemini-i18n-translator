#!/usr/bin/env bun
import { parseArgs } from "util";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readdir, readFile, mkdir, writeFile, access } from "fs/promises";
import { join, resolve } from "path";
import { translateJson } from "./lib/translate";
import { resolveIncremental } from "./lib/diff";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    input: { type: "string", short: "i" },
    output: { type: "string", short: "o" },
    lang: { type: "string", short: "l" },
    model: { type: "string", short: "m", default: "gemini-flash-lite-latest" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
});

if (values.help) {
  console.log(`Usage: gemini-i18n-translator [options]

Translate i18n JSON files using Google Gemini (non-interactive mode)

Options:
  -i, --input <path>   Path to English source directory
  -o, --output <path>  Base output directory
  -l, --lang <codes>   Comma-separated target language codes
  -m, --model <name>   Gemini model (default: gemini-flash-lite-latest)
  -h, --help           Show this help`);
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
const languages = values.lang.split(",").map((l) => l.trim());
const modelName = values.model!;

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
  `Translating ${jsonFiles.length} file(s) to ${languages.length} language(s) (${totalJobs} total)\n`
);

const jobs: Array<{ file: string; lang: string }> = [];
for (const file of jsonFiles) {
  for (const lang of languages) {
    jobs.push({ file, lang });
  }
}

const CONCURRENCY = 5;
let completed = 0;
let failed = 0;

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

    const { result: translated, skippedTranslation, staleKeys } = await resolveIncremental(
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

    completed++;
    if (skippedTranslation && staleKeys.size > 0) {
      console.log(`  [${completed + failed}/${totalJobs}] ${label} ... updated (removed stale keys)`);
    } else if (skippedTranslation) {
      console.log(`  [${completed + failed}/${totalJobs}] ${label} ... already up to date`);
    } else {
      console.log(`  [${completed + failed}/${totalJobs}] ${label} ... done`);
    }
  } catch (err) {
    failed++;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `  [${completed + failed}/${totalJobs}] ${label} ... FAILED: ${msg}`
    );
  }
}

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

console.log(`\nComplete: ${completed}/${totalJobs} succeeded, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
