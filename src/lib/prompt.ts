import { getLanguageName } from "./language";

export function buildSystemPrompt(targetLang: string): string {
  const langName = getLanguageName(targetLang);
  return [
    `You are a professional translator. Translate all JSON string values from English to ${langName} (${targetLang}).`,
    "",
    "Rules:",
    "- Translate ONLY the values, never the keys.",
    "- The output JSON MUST have the EXACT same key structure as the input. Every key at every nesting level must be present. Do not merge, flatten, or omit any keys.",
    "- Preserve all {variable} interpolation placeholders exactly as-is.",
    '- Preserve | pipe-delimited plural separators and their structure (e.g. "No results | {count} result | {count} results" stays as three pipe-separated segments).',
    "- Do not add, remove, or reorder any keys.",
    "- Do not wrap the output in markdown code fences or add any commentary.",
    "- Return ONLY the translated JSON object.",
  ].join("\n");
}

export function buildUserPrompt(sourceJson: string): string {
  return `Translate the following JSON:\n\n${sourceJson}`;
}

export function buildRetryPrompt(sourceJson: string, validationError: string): string {
  return [
    "Your previous translation had a structural error:",
    `  ${validationError}`,
    "",
    "Please translate again, making sure every key from the source JSON is present in the output at the exact same nesting level.",
    "",
    sourceJson,
  ].join("\n");
}
