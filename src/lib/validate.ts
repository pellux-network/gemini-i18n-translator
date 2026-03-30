type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    const lines = trimmed.split("\n");
    lines.shift();
    if (lines.at(-1)?.trim() === "```") {
      lines.pop();
    }
    return lines.join("\n");
  }
  return trimmed;
}

export function collectKeys(obj: JsonObject, prefix = ""): Set<string> {
  const keys = new Set<string>();
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.add(fullKey);
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      for (const nested of collectKeys(obj[key] as JsonObject, fullKey)) {
        keys.add(nested);
      }
    }
  }
  return keys;
}

export function parseAndValidate(raw: string, source: JsonObject): JsonObject {
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned) as JsonObject;

  const sourceKeys = collectKeys(source);
  const translatedKeys = collectKeys(parsed);

  const missing = [...sourceKeys].filter((k) => !translatedKeys.has(k));
  if (missing.length > 0) {
    throw new Error(`Validation failed: missing keys: ${missing.join(", ")}`);
  }

  const extra = [...translatedKeys].filter((k) => !sourceKeys.has(k));
  if (extra.length > 0) {
    throw new Error(`Validation failed: extra keys: ${extra.join(", ")}`);
  }

  return parsed;
}
