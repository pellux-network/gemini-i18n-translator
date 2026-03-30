const displayNames = new Intl.DisplayNames(["en"], { type: "language" });

/**
 * Normalize a BCP 47 language tag using Intl.Locale.
 * Fixes casing (e.g. "pt-br" → "pt-BR", "zh-hans" → "zh-Hans")
 * and validates structure. Returns null if the tag is invalid.
 */
export function normalizeBCP47(code: string): string | null {
  try {
    const locale = new Intl.Locale(code);
    return locale.toString();
  } catch {
    return null;
  }
}

/**
 * Get the English display name for a BCP 47 language tag.
 * Returns the normalized tag itself if no display name is available.
 */
export function getLanguageName(code: string): string {
  const normalized = normalizeBCP47(code);
  if (!normalized) return code;
  try {
    return displayNames.of(normalized) ?? normalized;
  } catch {
    return normalized;
  }
}

/**
 * Check whether a string is a valid BCP 47 language tag.
 */
export function isValidBCP47(code: string): boolean {
  return normalizeBCP47(code) !== null;
}
