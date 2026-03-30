import { readFile } from "fs/promises";
import { join, resolve } from "path";
import { collectKeys } from "./validate.js";
import logger from "./logger.js";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

export interface StaleKeyInfo {
  file: string;
  lang: string;
  keys: string[];
}

export function findMissingKeys(
  source: JsonObject,
  existing: JsonObject
): Set<string> {
  const sourceKeys = collectKeys(source);
  const existingKeys = collectKeys(existing);
  const missing = new Set<string>();
  for (const key of sourceKeys) {
    if (!existingKeys.has(key)) {
      missing.add(key);
    }
  }
  return missing;
}

export function findStaleKeys(
  source: JsonObject,
  existing: JsonObject
): Set<string> {
  const sourceKeys = collectKeys(source);
  const existingKeys = collectKeys(existing);
  const stale = new Set<string>();
  for (const key of existingKeys) {
    if (!sourceKeys.has(key)) {
      stale.add(key);
    }
  }
  return stale;
}

export function extractSubset(
  source: JsonObject,
  keys: Set<string>
): JsonObject {
  const result: JsonObject = {};
  for (const [key, value] of Object.entries(source)) {
    if (keys.has(key)) {
      result[key] = value;
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      const childKeys = new Set<string>();
      for (const k of keys) {
        if (k.startsWith(key + ".")) {
          childKeys.add(k.slice(key.length + 1));
        }
      }
      if (childKeys.size > 0) {
        result[key] = extractSubset(value as JsonObject, childKeys);
      }
    }
  }
  return result;
}

export function mergeTranslations(
  source: JsonObject,
  existing: JsonObject,
  translated: JsonObject
): JsonObject {
  const result: JsonObject = {};
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const translatedVal = translated[key];
    const existingVal = existing[key];

    if (
      typeof sourceVal === "object" &&
      sourceVal !== null &&
      !Array.isArray(sourceVal)
    ) {
      result[key] = mergeTranslations(
        sourceVal as JsonObject,
        (typeof existingVal === "object" && existingVal !== null && !Array.isArray(existingVal)
          ? existingVal
          : {}) as JsonObject,
        (typeof translatedVal === "object" && translatedVal !== null && !Array.isArray(translatedVal)
          ? translatedVal
          : {}) as JsonObject
      );
    } else if (translatedVal !== undefined) {
      result[key] = translatedVal;
    } else if (existingVal !== undefined) {
      result[key] = existingVal;
    } else {
      // Fallback to source value to avoid silently dropping keys
      result[key] = sourceVal;
    }
  }
  return result;
}

export interface IncrementalResult {
  result: JsonObject;
  skippedTranslation: boolean;
  staleKeys: Set<string>;
  missingKeys: Set<string>;
}

export async function resolveIncremental(
  source: JsonObject,
  existing: JsonObject | null,
  translate: (subset: JsonObject) => Promise<JsonObject>
): Promise<IncrementalResult> {
  if (!existing) {
    const result = await translate(source);
    return { result, skippedTranslation: false, staleKeys: new Set(), missingKeys: new Set() };
  }

  const staleKeys = findStaleKeys(source, existing);
  const missingKeys = findMissingKeys(source, existing);

  if (staleKeys.size > 0) {
    logger.warn({ staleCount: staleKeys.size, keys: [...staleKeys] }, "Dropping stale keys");
  }

  if (missingKeys.size === 0) {
    const result = mergeTranslations(source, existing, {});
    return { result, skippedTranslation: true, staleKeys, missingKeys };
  }

  const subset = extractSubset(source, missingKeys);
  const newTranslations = await translate(subset);
  const result = mergeTranslations(source, existing, newTranslations);
  return { result, skippedTranslation: false, staleKeys, missingKeys };
}

export async function scanForStaleKeys(
  files: string[],
  languages: string[],
  inputDir: string,
  outputDir: string
): Promise<StaleKeyInfo[]> {
  const staleList: StaleKeyInfo[] = [];
  for (const file of files) {
    const sourcePath = join(resolve(inputDir), file);
    let source: JsonObject;
    try {
      const sourceRaw = await readFile(sourcePath, "utf-8");
      source = JSON.parse(sourceRaw);
    } catch (err) {
      logger.warn({ file, error: String(err) }, "Failed to read source file for stale key scan, skipping");
      continue;
    }

    for (const lang of languages) {
      const existingPath = join(resolve(outputDir), lang, file);
      try {
        const existingRaw = await readFile(existingPath, "utf-8");
        const existing = JSON.parse(existingRaw);
        const stale = findStaleKeys(source, existing);
        if (stale.size > 0) {
          staleList.push({ file, lang, keys: [...stale] });
        }
      } catch {
        // File doesn't exist — no stale keys
      }
    }
  }
  return staleList;
}
