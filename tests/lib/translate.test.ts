import { describe, expect, test, mock } from "bun:test";
import { translateJson } from "../../src/lib/translate";

describe("translateJson", () => {
  test("calls Gemini and returns validated JSON", async () => {
    const source = { greeting: "Hello" };
    const fakeResponse = '{"greeting": "Bonjour"}';

    const mockGenerateContent = mock(() =>
      Promise.resolve({ response: { text: () => fakeResponse } })
    );

    const mockModel = {
      generateContent: mockGenerateContent,
    };

    const result = await translateJson(mockModel as any, source, "fr");

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ greeting: "Bonjour" });
  });

  test("retries once on invalid response then succeeds", async () => {
    const source = { greeting: "Hello" };

    let callCount = 0;
    const mockGenerateContent = mock(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ response: { text: () => "not json" } });
      }
      return Promise.resolve({
        response: { text: () => '{"greeting": "Bonjour"}' },
      });
    });

    const mockModel = {
      generateContent: mockGenerateContent,
    };

    const result = await translateJson(mockModel as any, source, "fr");
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ greeting: "Bonjour" });
  });

  test("throws after retry exhaustion", async () => {
    const source = { greeting: "Hello" };

    const mockGenerateContent = mock(() =>
      Promise.resolve({ response: { text: () => "bad" } })
    );

    const mockModel = {
      generateContent: mockGenerateContent,
    };

    await expect(translateJson(mockModel as any, source, "fr")).rejects.toThrow();
  });
});
