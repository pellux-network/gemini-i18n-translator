import React, { useEffect } from "react";
import { Box, Text, useApp } from "ink";
import { StatusMessage, Badge, ConfirmInput } from "@inkjs/ui";
import { Divider } from "../components/Divider.js";
import type { Job } from "./TranslationView.js";

interface DoneViewProps {
  completed: number;
  failed: number;
  failedJobs: Job[];
  onRetry: (jobs: Job[]) => void;
}

export function DoneView({ completed, failed, failedJobs, onRetry }: DoneViewProps) {
  const { exit } = useApp();
  const total = completed + failed;
  const allPassed = failed === 0;

  useEffect(() => {
    if (allPassed) {
      const timer = setTimeout(() => exit(), 1000);
      return () => clearTimeout(timer);
    }
  }, [allPassed]);

  return (
    <Box flexDirection="column">
      <Divider title="Complete" titleColor={allPassed ? "green" : "red"} />

      <StatusMessage variant={allPassed ? "success" : "error"}>
        {allPassed
          ? `All ${total} translations completed successfully!`
          : `${completed}/${total} succeeded, ${failed} failed`}
      </StatusMessage>

      <Box gap={1} marginTop={1}>
        <Badge color="green">{String(completed)} passed</Badge>
        {failed > 0 && <Badge color="red">{String(failed)} failed</Badge>}
      </Box>

      {failedJobs.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Divider title="Failures" titleColor="red" />

          {failedJobs.map((job) => (
            <Box key={`${job.file}-${job.lang}`} flexDirection="column" marginBottom={1}>
              <Box gap={1}>
                <Badge color="red">✗</Badge>
                <Text bold>{job.file} → {job.lang}</Text>
              </Box>
              {job.error && (
                <Box paddingLeft={4}>
                  <Text color="red" wrap="wrap">{job.error}</Text>
                </Box>
              )}
            </Box>
          ))}

          <Box marginTop={1} gap={1}>
            <Text bold>Retry failed translations?</Text>
            <ConfirmInput
              onConfirm={() => {
                const retryJobs = failedJobs.map((j) => ({
                  ...j,
                  status: "pending" as const,
                  error: undefined,
                }));
                onRetry(retryJobs);
              }}
              onCancel={() => exit()}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
