import { describe, expect, test } from "bun:test";
import {
  findMissingKeys,
  findStaleKeys,
  extractSubset,
  mergeTranslations,
  resolveIncremental,
} from "../../src/lib/diff";

describe("findMissingKeys", () => {
  test("returns missing flat keys", () => {
    const source = { greeting: "Hello", farewell: "Goodbye", newKey: "New" };
    const existing = { greeting: "Bonjour", farewell: "Au revoir" };
    const missing = findMissingKeys(source, existing);
    expect(missing).toEqual(new Set(["newKey"]));
  });

  test("returns missing nested keys", () => {
    const source = { nested: { save: "Save", cancel: "Cancel", undo: "Undo" } };
    const existing = { nested: { save: "Sauvegarder", cancel: "Annuler" } };
    const missing = findMissingKeys(source, existing);
    expect(missing).toEqual(new Set(["nested.undo"]));
  });

  test("returns empty set when nothing is missing", () => {
    const source = { greeting: "Hello" };
    const existing = { greeting: "Bonjour" };
    expect(findMissingKeys(source, existing)).toEqual(new Set());
  });

  test("returns all keys when existing is empty", () => {
    const source = { a: "A", b: { c: "C" } };
    const missing = findMissingKeys(source, {});
    expect(missing).toEqual(new Set(["a", "b", "b.c"]));
  });
});

describe("findStaleKeys", () => {
  test("returns stale flat keys", () => {
    const source = { greeting: "Hello" };
    const existing = { greeting: "Bonjour", removed: "Gone" };
    const stale = findStaleKeys(source, existing);
    expect(stale).toEqual(new Set(["removed"]));
  });

  test("returns stale nested keys", () => {
    const source = { nested: { save: "Save" } };
    const existing = { nested: { save: "Sauvegarder", old: "Ancien" } };
    const stale = findStaleKeys(source, existing);
    expect(stale).toEqual(new Set(["nested.old"]));
  });

  test("returns empty set when no stale keys", () => {
    const source = { greeting: "Hello", farewell: "Goodbye" };
    const existing = { greeting: "Bonjour" };
    expect(findStaleKeys(source, existing)).toEqual(new Set());
  });
});

describe("extractSubset", () => {
  test("extracts flat keys", () => {
    const source = { greeting: "Hello", farewell: "Goodbye", newKey: "New" };
    const keys = new Set(["newKey"]);
    expect(extractSubset(source, keys)).toEqual({ newKey: "New" });
  });

  test("extracts nested keys preserving structure", () => {
    const source = {
      greeting: "Hello",
      nested: { save: "Save", cancel: "Cancel", undo: "Undo" },
    };
    const keys = new Set(["nested.undo"]);
    expect(extractSubset(source, keys)).toEqual({ nested: { undo: "Undo" } });
  });

  test("returns empty object for empty key set", () => {
    const source = { greeting: "Hello" };
    expect(extractSubset(source, new Set())).toEqual({});
  });

  test("extracts mix of flat and nested keys", () => {
    const source = {
      a: "A",
      b: { c: "C", d: "D" },
      e: "E",
    };
    const keys = new Set(["a", "b.d"]);
    expect(extractSubset(source, keys)).toEqual({ a: "A", b: { d: "D" } });
  });
});

describe("mergeTranslations", () => {
  test("merges in source key order", () => {
    const source = { greeting: "Hello", newKey: "New", farewell: "Goodbye" };
    const existing = { farewell: "Au revoir", greeting: "Bonjour" };
    const translated = { newKey: "Nouveau" };
    const result = mergeTranslations(source, existing, translated);
    expect(result).toEqual({
      greeting: "Bonjour",
      newKey: "Nouveau",
      farewell: "Au revoir",
    });
    expect(Object.keys(result)).toEqual(["greeting", "newKey", "farewell"]);
  });

  test("excludes stale keys from existing", () => {
    const source = { greeting: "Hello" };
    const existing = { greeting: "Bonjour", stale: "Removed" };
    const translated = {};
    const result = mergeTranslations(source, existing, translated);
    expect(result).toEqual({ greeting: "Bonjour" });
    expect(Object.keys(result)).not.toContain("stale");
  });

  test("handles deep nesting", () => {
    const source = {
      a: { b: { c: "C", d: "D" }, e: "E" },
      f: "F",
    };
    const existing = { a: { b: { c: "Translated C" }, e: "Translated E" }, f: "Translated F" };
    const translated = { a: { b: { d: "Translated D" } } };
    const result = mergeTranslations(source, existing, translated);
    expect(result).toEqual({
      a: {
        b: { c: "Translated C", d: "Translated D" },
        e: "Translated E",
      },
      f: "Translated F",
    });
  });

  test("prefers translated over existing for same key", () => {
    const source = { greeting: "Hello" };
    const existing = { greeting: "Old" };
    const translated = { greeting: "New" };
    const result = mergeTranslations(source, existing, translated);
    expect(result).toEqual({ greeting: "New" });
  });

  test("handles all keys being new (no existing)", () => {
    const source = { a: "A", b: "B" };
    const existing = {};
    const translated = { a: "Translated A", b: "Translated B" };
    const result = mergeTranslations(source, existing, translated);
    expect(result).toEqual({ a: "Translated A", b: "Translated B" });
  });

  test("falls back to source value when key missing from both translated and existing", () => {
    const source = { greeting: "Hello", missing: "Fallback" };
    const existing = {};
    const translated = { greeting: "Bonjour" };
    const result = mergeTranslations(source, existing, translated);
    expect(result).toEqual({ greeting: "Bonjour", missing: "Fallback" });
  });
});

describe("resolveIncremental", () => {
  test("does full translation when no existing file", async () => {
    const source = { a: "A", b: "B" };
    const translated = { a: "X", b: "Y" };
    const result = await resolveIncremental(source, null, async () => translated);
    expect(result.result).toEqual(translated);
    expect(result.skippedTranslation).toBe(false);
    expect(result.staleKeys.size).toBe(0);
  });

  test("skips translation when no missing keys", async () => {
    const source = { a: "A" };
    const existing = { a: "X", stale: "Gone" };
    const translate = async () => { throw new Error("should not be called"); };
    const result = await resolveIncremental(source, existing, translate);
    expect(result.result).toEqual({ a: "X" });
    expect(result.skippedTranslation).toBe(true);
    expect(result.staleKeys).toEqual(new Set(["stale"]));
  });

  test("translates only missing keys and merges", async () => {
    const source = { a: "A", b: "B" };
    const existing = { a: "X" };
    const result = await resolveIncremental(source, existing, async (subset) => {
      expect(subset).toEqual({ b: "B" });
      return { b: "Y" };
    });
    expect(result.result).toEqual({ a: "X", b: "Y" });
    expect(result.skippedTranslation).toBe(false);
    expect(result.missingKeys).toEqual(new Set(["b"]));
  });
});
