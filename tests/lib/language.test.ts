import { describe, expect, test } from "bun:test";
import { normalizeBCP47, getLanguageName, isValidBCP47 } from "../../src/lib/language";

describe("normalizeBCP47", () => {
  test("returns simple language codes as-is", () => {
    expect(normalizeBCP47("fr")).toBe("fr");
    expect(normalizeBCP47("de")).toBe("de");
  });

  test("normalizes region casing", () => {
    expect(normalizeBCP47("pt-br")).toBe("pt-BR");
    expect(normalizeBCP47("en-us")).toBe("en-US");
    expect(normalizeBCP47("zh-tw")).toBe("zh-TW");
  });

  test("normalizes script casing", () => {
    expect(normalizeBCP47("zh-hans")).toBe("zh-Hans");
    expect(normalizeBCP47("sr-latn")).toBe("sr-Latn");
  });

  test("handles full tags with script and region", () => {
    expect(normalizeBCP47("zh-hant-tw")).toBe("zh-Hant-TW");
  });

  test("returns null for invalid tags", () => {
    expect(normalizeBCP47("")).toBeNull();
    expect(normalizeBCP47("123")).toBeNull();
    expect(normalizeBCP47("!!!")).toBeNull();
  });
});

describe("getLanguageName", () => {
  test("returns English name for simple codes", () => {
    expect(getLanguageName("fr")).toBe("French");
    expect(getLanguageName("ja")).toBe("Japanese");
  });

  test("returns descriptive name for regional variants", () => {
    const name = getLanguageName("pt-BR");
    expect(name).toContain("Portuguese");
    expect(name).toContain("Brazil");
  });

  test("handles script subtags", () => {
    const name = getLanguageName("zh-Hans");
    expect(name).toContain("Chinese");
  });

  test("returns the input for invalid codes", () => {
    expect(getLanguageName("zzz-invalid")).toBe("zzz-invalid");
  });
});

describe("isValidBCP47", () => {
  test("accepts valid codes", () => {
    expect(isValidBCP47("en")).toBe(true);
    expect(isValidBCP47("pt-BR")).toBe(true);
    expect(isValidBCP47("zh-Hant-TW")).toBe(true);
    expect(isValidBCP47("sr-Latn")).toBe(true);
  });

  test("accepts valid codes with wrong casing", () => {
    expect(isValidBCP47("pt-br")).toBe(true);
    expect(isValidBCP47("ZH-TW")).toBe(true);
  });

  test("rejects invalid codes", () => {
    expect(isValidBCP47("")).toBe(false);
    expect(isValidBCP47("123")).toBe(false);
  });
});
