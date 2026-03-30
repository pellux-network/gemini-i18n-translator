import React, { useState } from "react";
import { Box, Text } from "ink";
import { TextInput, StatusMessage } from "@inkjs/ui";

const KNOWN_LANGUAGE_CODES = new Set([
  "af", "ar", "bg", "bn", "ca", "cs", "da", "de", "el", "es", "et", "fa",
  "fi", "fr", "gu", "he", "hi", "hr", "hu", "id", "it", "ja", "ka", "kn",
  "ko", "lt", "lv", "ml", "mr", "ms", "nb", "nl", "pl", "pt", "pt-BR",
  "ro", "ru", "sk", "sl", "sr", "sv", "ta", "te", "th", "tr", "uk", "ur",
  "vi", "zh", "zh-TW",
]);

interface LangStepProps {
  onNext: (languages: string[]) => void;
}

export function LangStep({ onNext }: LangStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const handleSubmit = (value: string) => {
    const languages = value
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (languages.length === 0) {
      setError("Enter at least one language code");
      return;
    }

    const unknown = languages.filter((l) => !KNOWN_LANGUAGE_CODES.has(l));
    if (unknown.length > 0 && !warning) {
      setWarning(`Unrecognized language code(s): ${unknown.join(", ")}. Press Enter again to continue anyway.`);
      setError(null);
      return;
    }

    onNext(languages);
  };

  return (
    <Box flexDirection="column" gap={0}>
      <Box gap={1}>
        <Text bold color="cyan">?</Text>
        <Text bold>Target languages (comma-separated):</Text>
      </Box>
      <Box paddingLeft={2}>
        <TextInput
          placeholder="fr,de,ja"
          onSubmit={handleSubmit}
        />
      </Box>
      {error && (
        <Box paddingLeft={2}>
          <StatusMessage variant="error">{error}</StatusMessage>
        </Box>
      )}
      {warning && (
        <Box paddingLeft={2}>
          <StatusMessage variant="warning">{warning}</StatusMessage>
        </Box>
      )}
    </Box>
  );
}
