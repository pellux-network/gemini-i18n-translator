import React from "react";
import { Box, Text } from "ink";
import { Badge, ConfirmInput } from "@inkjs/ui";
import { Divider } from "../components/Divider.js";
import { getLanguageName } from "../../lib/language.js";

interface ConfirmStepProps {
  inputDir: string;
  outputDir: string;
  languages: string[];
  files: string[];
  model: string;
  onConfirm: () => void;
  onBack: () => void;
}

export function ConfirmStep({
  inputDir,
  outputDir,
  languages,
  files,
  model,
  onConfirm,
  onBack,
}: ConfirmStepProps) {
  const totalJobs = files.length * languages.length;

  return (
    <Box flexDirection="column">
      <Divider title="Translation Summary" titleColor="cyan" />

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        gap={0}
      >
        <Box gap={1}>
          <Text bold>Source:</Text>
          <Text>{inputDir}</Text>
          <Text dimColor>({files.length} files)</Text>
        </Box>
        <Box gap={1}>
          <Text bold>Output:</Text>
          <Text>{outputDir}</Text>
          <Text dimColor>({languages.map((l) => `${l}/`).join(", ")} created automatically)</Text>
        </Box>
        <Box gap={1} flexWrap="wrap">
          <Text bold>Languages:</Text>
          {languages.map((lang) => (
            <Box key={lang} gap={0}>
              <Badge color="cyan">{lang}</Badge>
              <Text dimColor> ({getLanguageName(lang)})</Text>
            </Box>
          ))}
        </Box>
        <Box gap={1}>
          <Text bold>Model:</Text>
          <Badge color="magenta">{model}</Badge>
        </Box>
        <Box gap={1}>
          <Text bold>Total:</Text>
          <Text color="yellow">{totalJobs} translations</Text>
        </Box>
      </Box>

      <Box marginTop={1} gap={1}>
        <Text bold>Start translation?</Text>
        <ConfirmInput onConfirm={onConfirm} onCancel={onBack} />
        <Text dimColor>(n to go back)</Text>
      </Box>
    </Box>
  );
}
