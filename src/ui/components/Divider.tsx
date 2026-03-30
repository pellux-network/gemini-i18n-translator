import React from "react";
import { Box, Text } from "ink";

interface DividerProps {
  title?: string;
  titleColor?: string;
  width?: number;
}

export function Divider({ title, titleColor = "white", width = 60 }: DividerProps) {
  if (!title) {
    return (
      <Box>
        <Text dimColor>{"─".repeat(width)}</Text>
      </Box>
    );
  }

  const padding = 1;
  const titleLen = title.length + padding * 2;
  const sideLen = Math.max(1, Math.floor((width - titleLen - 2) / 2));
  const leftLine = "─".repeat(sideLen);
  const rightLine = "─".repeat(sideLen);

  return (
    <Box>
      <Text dimColor>{leftLine}</Text>
      <Text color={titleColor}> {title} </Text>
      <Text dimColor>{rightLine}</Text>
    </Box>
  );
}
