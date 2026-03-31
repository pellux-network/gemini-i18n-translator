import React from "react";
import { Box, Text } from "ink";
import { Badge, ConfirmInput } from "@inkjs/ui";
import { Divider } from "../components/Divider.js";
import { getLanguageName } from "../../lib/language.js";
import type { JobScanResult } from "../../lib/diff.js";

interface ConfirmStepProps {
  inputDir: string;
  outputDir: string;
  languages: string[];
  files: string[];
  model: string;
  scanResult: JobScanResult | null;
  onConfirm: () => void;
  onBack: () => void;
}

export function ConfirmStep({
  inputDir,
  outputDir,
  languages,
  files,
  model,
  scanResult,
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
        {scanResult && (scanResult.updateJobs > 0 || scanResult.upToDateJobs > 0) && (
          <Box gap={1} paddingLeft={2}>
            {scanResult.newJobs > 0 && <Badge color="yellow">{String(scanResult.newJobs)} new</Badge>}
            {scanResult.updateJobs > 0 && <Badge color="green">{String(scanResult.updateJobs)} update</Badge>}
            {scanResult.upToDateJobs > 0 && <Badge color="cyan">{String(scanResult.upToDateJobs)} up to date</Badge>}
          </Box>
        )}
      </Box>

      <Box marginTop={1} gap={1}>
        <Text bold>Start translation?</Text>
        <ConfirmInput onConfirm={onConfirm} onCancel={onBack} />
        <Text dimColor>(n to go back)</Text>
      </Box>
    </Box>
  );
}
