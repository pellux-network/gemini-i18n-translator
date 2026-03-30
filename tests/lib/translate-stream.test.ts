import { describe, expect, test, mock } from "bun:test";
import { translateJsonStream } from "../../src/lib/translate";

describe("translateJsonStream", () => {
  test("streams chunks and returns validated JSON", async () => {
    const source = { greeting: "Hello" };
    const chunks = ['{"gree', 'ting": "Bonj', 'our"}'];
    const receivedChunks: string[] = [];

    async function* fakeStream() {
      for (const chunk of chunks) {
        yield { text: () => chunk };
      }
    }

    const mockGenerateContentStream = mock(() =>
      Promise.resolve({ stream: fakeStream() })
    );

    const mockModel = {
      generateContentStream: mockGenerateContentStream,
    };

    const result = await translateJsonStream(
      mockModel as any,
      source,
      "fr",
      (chunk: string) => {
        receivedChunks.push(chunk);
      }
    );

    expect(mockGenerateContentStream).toHaveBeenCalledTimes(1);
    expect(receivedChunks).toEqual(chunks);
    expect(result).toEqual({ greeting: "Bonjour" });
  });

  test("retries once on invalid response", async () => {
    const source = { greeting: "Hello" };
    let callCount = 0;

    async function* badStream() {
      yield { text: () => "not json" };
    }

    async function* goodStream() {
      yield { text: () => '{"greeting": "Bonjour"}' };
    }

    const mockGenerateContentStream = mock(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ stream: badStream() });
      }
      return Promise.resolve({ stream: goodStream() });
    });

    const mockModel = {
      generateContentStream: mockGenerateContentStream,
    };

    const result = await translateJsonStream(
      mockModel as any,
      source,
      "fr",
      () => {}
    );

    expect(mockGenerateContentStream).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ greeting: "Bonjour" });
  });

  test("throws after retry exhaustion", async () => {
    const source = { greeting: "Hello" };

    async function* badStream() {
      yield { text: () => "bad" };
    }

    const mockGenerateContentStream = mock(() =>
      Promise.resolve({ stream: badStream() })
    );

    const mockModel = {
      generateContentStream: mockGenerateContentStream,
    };

    await expect(
      translateJsonStream(mockModel as any, source, "fr", () => {})
    ).rejects.toThrow();
  });
});
