import React, { useState } from "react";
import { Box, Text } from "ink";
import { TextInput, StatusMessage } from "@inkjs/ui";
import { isValidBCP47, normalizeBCP47 } from "../lib/language";

interface LangStepProps {
  onNext: (languages: string[]) => void;
}

export function LangStep({ onNext }: LangStepProps) {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (value: string) => {
    const languages = value
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (languages.length === 0) {
      setError("Enter at least one language code");
      return;
    }

    const invalid = languages.filter((l) => !isValidBCP47(l));
    if (invalid.length > 0) {
      setError(`Invalid BCP 47 language code(s): ${invalid.join(", ")}`);
      return;
    }

    const normalized = languages.map((l) => normalizeBCP47(l)!);
    onNext(normalized);
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
    </Box>
  );
}
