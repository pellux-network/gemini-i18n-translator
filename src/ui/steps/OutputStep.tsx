import React, { useState } from "react";
import { Box, Text } from "ink";
import { resolve } from "path";
import { PathInput } from "../components/PathInput.js";

interface OutputStepProps {
  onNext: (outputDir: string) => void;
}

export function OutputStep({ onNext }: OutputStepProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (submitted: string) => {
    const trimmed = submitted.trim();
    if (!trimmed) return;
    onNext(resolve(trimmed));
  };

  return (
    <Box flexDirection="column" gap={0}>
      <Box gap={1}>
        <Text bold color="cyan">?</Text>
        <Text bold>Output directory:</Text>
      </Box>
      <Box paddingLeft={2}>
        <PathInput
          placeholder="./locales"
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
        />
      </Box>
    </Box>
  );
}
