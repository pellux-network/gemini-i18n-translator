import React, { useEffect } from "react";
import { Box, Text } from "ink";
import { StatusMessage, Badge } from "@inkjs/ui";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";
import { Divider } from "../components/Divider.js";
import logger from "../../lib/logger.js";

interface ConfigCheckProps {
  apiKey: string;
  model: string;
  onNext: () => void;
  onError: () => void;
}

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "..." + key.slice(-4);
}

export function ConfigCheck({ apiKey, model, onNext, onError }: ConfigCheckProps) {
  useEffect(() => {
    if (apiKey) {
      logger.info({ model, apiKeyPresent: true }, "Configuration loaded");
    } else {
      logger.error("GEMINI_API_KEY not found in environment");
    }

    const timer = setTimeout(() => {
      if (apiKey) {
        onNext();
      } else {
        onError();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box flexDirection="column">
      <Gradient name="vice">
        <BigText text="i18n Translator" font="simple" />
      </Gradient>

      <Divider title="Configuration" titleColor="cyan" />

      {apiKey ? (
        <Box flexDirection="column" gap={0}>
          <StatusMessage variant="success">
            API Key: {maskKey(apiKey)}
          </StatusMessage>
          <Box gap={1}>
            <Text>  Model:</Text>
            <Badge color="cyan">{model}</Badge>
          </Box>
        </Box>
      ) : (
        <StatusMessage variant="error">
          GEMINI_API_KEY not found in environment. Add it to .env
        </StatusMessage>
      )}
    </Box>
  );
}
