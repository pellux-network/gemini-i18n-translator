import { describe, expect, test } from "bun:test";
import { parseAndValidate } from "../../src/lib/validate";

describe("parseAndValidate", () => {
  test("accepts valid translation with matching keys", () => {
    const source = { greeting: "Hello", farewell: "Goodbye" };
    const raw = '{"greeting": "Bonjour", "farewell": "Au revoir"}';
    const result = parseAndValidate(raw, source);
    expect(result).toEqual({ greeting: "Bonjour", farewell: "Au revoir" });
  });

  test("accepts valid nested translation", () => {
    const source = { tabs: { all: "All", printers: "Printers" } };
    const raw = '{"tabs": {"all": "Tous", "printers": "Imprimantes"}}';
    const result = parseAndValidate(raw, source);
    expect(result).toEqual({ tabs: { all: "Tous", printers: "Imprimantes" } });
  });

  test("throws on invalid JSON", () => {
    const source = { greeting: "Hello" };
    expect(() => parseAndValidate("not json", source)).toThrow();
  });

  test("throws on missing key", () => {
    const source = { greeting: "Hello", farewell: "Goodbye" };
    const raw = '{"greeting": "Bonjour"}';
    expect(() => parseAndValidate(raw, source)).toThrow("missing");
  });

  test("throws on extra key", () => {
    const source = { greeting: "Hello" };
    const raw = '{"greeting": "Bonjour", "extra": "Nope"}';
    expect(() => parseAndValidate(raw, source)).toThrow("extra");
  });

  test("strips markdown code fences", () => {
    const source = { greeting: "Hello" };
    const raw = '```json\n{"greeting": "Bonjour"}\n```';
    const result = parseAndValidate(raw, source);
    expect(result).toEqual({ greeting: "Bonjour" });
  });
});
