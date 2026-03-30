import { collectKeys } from "./validate.js";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

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
    }
  }
  return result;
}
