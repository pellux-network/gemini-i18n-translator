import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Text, useStdout } from "ink";
import { Spinner, ProgressBar, Badge } from "@inkjs/ui";
import { Divider } from "../components/Divider.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFile, mkdir, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { translateJsonStream } from "../../lib/translate.js";
import logger from "../../lib/logger.js";

type JobStatus = "pending" | "running" | "done" | "failed";

export interface Job {
  file: string;
  lang: string;
  status: JobStatus;
  error?: string;
}

export interface TranslationResult {
  completed: number;
  failed: number;
  failedJobs: Job[];
}

interface TranslationViewProps {
  apiKey: string;
  model: string;
  inputDir: string;
  outputDir: string;
  jobs: Job[];
  onDone: (result: TranslationResult) => void;
}

const STATUS_ICONS: Record<JobStatus, string> = {
  pending: "○",
  running: "◉",
  done: "✓",
  failed: "✗",
};

const STATUS_COLORS: Record<JobStatus, string | undefined> = {
  pending: undefined,
  running: "yellow",
  done: "green",
  failed: "red",
};

function JobGrid({ jobs }: { jobs: Job[] }) {
  const { stdout } = useStdout();
  const termWidth = stdout?.columns ?? 80;

  const { columns, rows } = useMemo(() => {
    // Find the longest label to determine cell width
    const maxLabel = jobs.reduce((max, j) => {
      const label = `${j.file} → ${j.lang}`;
      return Math.max(max, label.length);
    }, 0);
    // icon + space + label + padding
    const cellWidth = maxLabel + 4;
    const cols = Math.max(1, Math.floor(termWidth / cellWidth));

    const gridRows: Job[][] = [];
    for (let i = 0; i < jobs.length; i += cols) {
      gridRows.push(jobs.slice(i, i + cols));
    }

    return { columns: cols, rows: gridRows, cellWidth };
  }, [jobs, termWidth]);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {rows.map((row, rowIdx) => (
        <Box key={rowIdx} gap={2}>
          {row.map((job) => {
            const label = `${job.file} → ${job.lang}`;
            const icon = STATUS_ICONS[job.status];
            const color = STATUS_COLORS[job.status];
            const dimmed = job.status === "pending";

            return (
              <Box key={`${job.file}-${job.lang}`} gap={0}>
                {job.status === "running" ? (
                  <Box gap={1}>
                    <Spinner label="" />
                    <Text color={color}>{label}</Text>
                  </Box>
                ) : (
                  <Text dimColor={dimmed} color={color}>
                    {icon} {label}
                  </Text>
                )}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

export function TranslationView({
  apiKey,
  model: modelName,
  inputDir,
  outputDir,
  jobs: initialJobs,
  onDone,
}: TranslationViewProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [streamText, setStreamText] = useState("");
  const [currentLabel, setCurrentLabel] = useState("");
  const [started, setStarted] = useState(false);

  const totalJobs = jobs.length;
  const completed = jobs.filter((j) => j.status === "done").length;
  const failed = jobs.filter((j) => j.status === "failed").length;
  const progress = totalJobs > 0 ? Math.round(((completed + failed) / totalJobs) * 100) : 0;

  const updateJob = useCallback(
    (file: string, lang: string, update: Partial<Job>) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.file === file && j.lang === lang ? { ...j, ...update } : j
        )
      );
    },
    []
  );

  useEffect(() => {
    if (started) return;
    setStarted(true);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const CONCURRENCY = 5;

    async function processJob(job: Job): Promise<void> {
      const { file, lang } = job;
      const label = `${file} → ${lang}`;

      updateJob(file, lang, { status: "running" });
      setCurrentLabel(label);
      setStreamText("");
      logger.info({ file, lang }, `Starting translation: ${label}`);

      try {
        const sourcePath = join(resolve(inputDir), file);
        const raw = await readFile(sourcePath, "utf-8");
        const source = JSON.parse(raw);

        const translated = await translateJsonStream(
          model,
          source,
          lang,
          (chunk: string) => {
            setStreamText((prev) => prev + chunk);
          }
        );

        const langDir = join(resolve(outputDir), lang);
        await mkdir(langDir, { recursive: true });
        await writeFile(
          join(langDir, file),
          JSON.stringify(translated, null, 2) + "\n",
          "utf-8"
        );

        updateJob(file, lang, { status: "done" });
        logger.info({ file, lang }, `Completed: ${label}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        updateJob(file, lang, { status: "failed", error: msg });
        logger.error({ file, lang, error: msg }, `Failed: ${label}`);
      }
    }

    async function runAll() {
      const pending = [...jobs];
      const executing = new Set<Promise<void>>();

      for (const job of pending) {
        const p = processJob(job).then(() => {
          executing.delete(p);
        });
        executing.add(p);
        if (executing.size >= CONCURRENCY) {
          await Promise.race(executing);
        }
      }
      await Promise.all(executing);
    }

    logger.info({ totalJobs: jobs.length, concurrency: CONCURRENCY }, "Starting translation run");

    runAll()
      .then(() => {
        setTimeout(() => {
          setJobs((current) => {
            const c = current.filter((j) => j.status === "done").length;
            const f = current.filter((j) => j.status === "failed").length;
            const failedJobs = current.filter((j) => j.status === "failed");
            onDone({ completed: c, failed: f, failedJobs });
            return current;
          });
        }, 500);
      })
      .catch((err) => {
        logger.error({ error: String(err) }, "Unexpected error in translation run");
      });
  }, []);

  // Limit stream display to last 12 lines
  const streamLines = streamText.split("\n").slice(-12).join("\n");

  return (
    <Box flexDirection="column">
      <Divider title="Translating" titleColor="cyan" />

      {/* Progress */}
      <Box flexDirection="column" marginBottom={1}>
        <Box gap={1}>
          <Text bold>Progress:</Text>
          <Text>
            {completed + failed}/{totalJobs}
          </Text>
          {failed > 0 && <Text color="red">({failed} failed)</Text>}
        </Box>
        <Box width={60}>
          <ProgressBar value={progress} />
        </Box>
      </Box>

      {/* Job grid */}
      <JobGrid jobs={jobs} />

      {/* Streaming pane */}
      {currentLabel && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          paddingX={1}
          height={14}
          overflow="hidden"
        >
          <Text bold dimColor>
            Current: {currentLabel}
          </Text>
          <Text wrap="truncate-end">{streamLines}</Text>
        </Box>
      )}
    </Box>
  );
}
