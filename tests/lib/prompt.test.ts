import { describe, expect, test } from "bun:test";
import { buildSystemPrompt, buildUserPrompt, buildRetryPrompt } from "../../src/lib/prompt";

describe("buildSystemPrompt", () => {
  test("includes target language name", () => {
    const prompt = buildSystemPrompt("fr");
    expect(prompt).toContain("French");
  });

  test("mentions preserving placeholders", () => {
    const prompt = buildSystemPrompt("de");
    expect(prompt).toContain("{");
    expect(prompt).toContain("|");
  });

  test("instructs to return only JSON", () => {
    const prompt = buildSystemPrompt("ja");
    expect(prompt.toLowerCase()).toContain("json");
  });
});

describe("buildUserPrompt", () => {
  test("includes the source JSON", () => {
    const source = '{"hello": "Hello"}';
    const prompt = buildUserPrompt(source);
    expect(prompt).toContain(source);
  });
});

describe("buildRetryPrompt", () => {
  test("includes the validation error", () => {
    const source = '{"hello": "Hello"}';
    const error = "missing keys: home.statsTitle";
    const prompt = buildRetryPrompt(source, error);
    expect(prompt).toContain(error);
  });

  test("includes the source JSON", () => {
    const source = '{"hello": "Hello"}';
    const prompt = buildRetryPrompt(source, "some error");
    expect(prompt).toContain(source);
  });
});
