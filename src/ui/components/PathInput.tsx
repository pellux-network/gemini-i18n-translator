import React, { useMemo, useCallback } from "react";
import { Text, useInput } from "ink";
import chalk from "chalk";
import { usePathSuggestions } from "../hooks/usePathSuggestions.js";

interface PathInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isDisabled?: boolean;
}

interface InputState {
  value: string;
  cursorOffset: number;
  suggestion: string | undefined;
}

const cursor = chalk.inverse(" ");

export function PathInput({
  placeholder = "",
  value,
  onChange,
  onSubmit,
  isDisabled = false,
}: PathInputProps) {
  const suggestions = usePathSuggestions(value);

  const suggestion = useMemo(() => {
    if (value.length === 0) return undefined;
    return suggestions
      .find((s) => s.startsWith(value))
      ?.replace(value, "");
  }, [value, suggestions]);

  const renderedValue = useMemo(() => {
    if (isDisabled) return value;

    if (value.length === 0) {
      return placeholder
        ? chalk.inverse(placeholder[0]) + chalk.dim(placeholder.slice(1))
        : cursor;
    }

    let result = value + cursor;

    if (suggestion) {
      result =
        value +
        chalk.inverse(suggestion[0]!) +
        chalk.dim(suggestion.slice(1));
    }

    return result;
  }, [value, suggestion, placeholder, isDisabled]);

  useInput(
    (input, key) => {
      if (key.upArrow || key.downArrow || (key.ctrl && input === "c")) {
        return;
      }

      // Tab: accept suggestion
      if (key.tab) {
        if (suggestion) {
          const completed = value + suggestion;
          onChange(completed);
        }
        return;
      }

      // Enter: submit (accept suggestion first if present)
      if (key.return) {
        if (suggestion) {
          const completed = value + suggestion;
          onChange(completed);
          onSubmit(completed);
        } else {
          onSubmit(value);
        }
        return;
      }

      if (key.backspace || key.delete) {
        if (value.length > 0) {
          onChange(value.slice(0, -1));
        }
        return;
      }

      if (key.leftArrow || key.rightArrow) {
        return;
      }

      // Regular character input
      onChange(value + input);
    },
    { isActive: !isDisabled }
  );

  return <Text>{renderedValue}</Text>;
}
