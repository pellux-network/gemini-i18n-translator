import type { GenerativeModel } from "@google/generative-ai";
import { buildSystemPrompt, buildUserPrompt, buildRetryPrompt } from "./prompt";
import { parseAndValidate } from "./validate";
import logger from "./logger.js";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

const MAX_RETRIES = 1;

export async function translateJson(
  model: GenerativeModel,
  source: JsonObject,
  targetLang: string
): Promise<JsonObject> {
  const systemPrompt = buildSystemPrompt(targetLang);
  const sourceJson = JSON.stringify(source, null, 2);
  const keyCount = Object.keys(source).length;

  logger.debug({ targetLang, keyCount }, "Starting translation (non-streaming)");

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const userPrompt = attempt === 0 || !lastError
      ? buildUserPrompt(sourceJson)
      : buildRetryPrompt(sourceJson, lastError.message);

    try {
      if (attempt > 0) {
        logger.warn({ targetLang, attempt, priorError: lastError?.message }, "Retrying translation with error context");
      }

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
      });

      const raw = result.response.text();
      logger.debug({ targetLang, responseLength: raw.length }, "Received Gemini response");

      const validated = parseAndValidate(raw, source);
      logger.info({ targetLang, keyCount }, "Translation validated successfully");
      return validated;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logger.error({ targetLang, attempt, error: lastError.message }, "Translation attempt failed");
    }
  }

  throw lastError ?? new Error("Translation failed");
}

export async function translateJsonStream(
  model: GenerativeModel,
  source: JsonObject,
  targetLang: string,
  onChunk: (text: string) => void
): Promise<JsonObject> {
  const systemPrompt = buildSystemPrompt(targetLang);
  const sourceJson = JSON.stringify(source, null, 2);
  const keyCount = Object.keys(source).length;

  logger.debug({ targetLang, keyCount }, "Starting streaming translation");

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const userPrompt = attempt === 0 || !lastError
      ? buildUserPrompt(sourceJson)
      : buildRetryPrompt(sourceJson, lastError.message);

    try {
      if (attempt > 0) {
        logger.warn({ targetLang, attempt, priorError: lastError?.message }, "Retrying streaming translation with error context");
      }

      const { stream } = await model.generateContentStream({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
      });

      let accumulated = "";
      let chunkCount = 0;
      for await (const chunk of stream) {
        const text = chunk.text();
        accumulated += text;
        chunkCount++;
        onChunk(text);
      }

      logger.debug({ targetLang, chunkCount, totalLength: accumulated.length }, "Stream complete, validating");

      const validated = parseAndValidate(accumulated, source);
      logger.info({ targetLang, keyCount }, "Streaming translation validated successfully");
      return validated;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logger.error({ targetLang, attempt, error: lastError.message }, "Streaming translation attempt failed");
    }
  }

  throw lastError ?? new Error("Streaming translation failed");
}
