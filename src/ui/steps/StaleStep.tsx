import React from "react";
import { Box, Text } from "ink";
import { ConfirmInput } from "@inkjs/ui";
import { Divider } from "../components/Divider.js";

export interface StaleKeyInfo {
  file: string;
  lang: string;
  keys: string[];
}

interface StaleStepProps {
  staleKeys: StaleKeyInfo[];
  onConfirm: () => void;
  onBack: () => void;
}

export function StaleStep({ staleKeys, onConfirm, onBack }: StaleStepProps) {
  const totalStale = staleKeys.reduce((sum, s) => sum + s.keys.length, 0);

  return (
    <Box flexDirection="column">
      <Divider title="Stale Keys Detected" titleColor="yellow" />

      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow">
          Found {totalStale} stale key(s) across {staleKeys.length} file(s) that
          will be removed:
        </Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="yellow"
        paddingX={2}
        paddingY={1}
        gap={1}
      >
        {staleKeys.map(({ file, lang, keys }) => (
          <Box key={`${file}-${lang}`} flexDirection="column">
            <Text bold>
              {file} → {lang}
            </Text>
            {keys.map((key) => (
              <Text key={key} dimColor>
                {"  "}- {key}
              </Text>
            ))}
          </Box>
        ))}
      </Box>

      <Box marginTop={1} gap={1}>
        <Text bold>Drop stale keys and continue?</Text>
        <ConfirmInput onConfirm={onConfirm} onCancel={onBack} />
        <Text dimColor>(n to go back)</Text>
      </Box>
    </Box>
  );
}
