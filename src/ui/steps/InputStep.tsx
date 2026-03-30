import React, { useState } from "react";
import { Box, Text } from "ink";
import { StatusMessage } from "@inkjs/ui";
import { readdir } from "fs/promises";
import { resolve } from "path";
import { PathInput } from "../components/PathInput.js";

interface InputStepProps {
  onNext: (inputDir: string, files: string[]) => void;
}

export function InputStep({ onNext }: InputStepProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (submitted: string) => {
    const trimmed = submitted.trim();
    if (!trimmed) {
      setError("Path cannot be empty");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const dir = resolve(trimmed);
      const entries = await readdir(dir);
      const jsonFiles = entries.filter((f) => f.endsWith(".json"));

      if (jsonFiles.length === 0) {
        setError(`No JSON files found in ${dir}`);
        setIsValidating(false);
        return;
      }

      onNext(dir, jsonFiles);
    } catch {
      setError(`Directory not found: ${trimmed}`);
      setIsValidating(false);
    }
  };

  return (
    <Box flexDirection="column" gap={0}>
      <Box gap={1}>
        <Text bold color="cyan">?</Text>
        <Text bold>Source directory (English JSON files):</Text>
      </Box>
      <Box paddingLeft={2}>
        <PathInput
          placeholder="./locales/en"
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          isDisabled={isValidating}
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
