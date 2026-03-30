import React, { useState } from "react";
import { Box, useApp } from "ink";
import { ConfigCheck } from "./steps/ConfigCheck.js";
import { InputStep } from "./steps/InputStep.js";
import { OutputStep } from "./steps/OutputStep.js";
import { LangStep } from "./steps/LangStep.js";
import { ConfirmStep } from "./steps/ConfirmStep.js";
import { TranslationView, type Job, type TranslationResult } from "./views/TranslationView.js";
import { DoneView } from "./views/DoneView.js";
import logger from "../lib/logger.js";

export type AppStep =
  | "config"
  | "input"
  | "output"
  | "lang"
  | "confirm"
  | "translating"
  | "done";

export interface AppState {
  apiKey: string;
  model: string;
  inputDir: string;
  outputDir: string;
  languages: string[];
  files: string[];
}

export function App() {
  const { exit } = useApp();
  const [step, setStep] = useState<AppStep>("config");
  const [results, setResults] = useState<TranslationResult>({
    completed: 0,
    failed: 0,
    failedJobs: [],
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  // Increment to force remount of TranslationView on retry
  const [runKey, setRunKey] = useState(0);
  const [state, setState] = useState<AppState>({
    apiKey: process.env.GEMINI_API_KEY ?? "",
    model: process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest",
    inputDir: "",
    outputDir: "",
    languages: [],
    files: [],
  });

  const updateState = (partial: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  };

  const buildJobs = (files: string[], languages: string[]): Job[] => {
    const list: Job[] = [];
    for (const file of files) {
      for (const lang of languages) {
        list.push({ file, lang, status: "pending" });
      }
    }
    return list;
  };

  return (
    <Box flexDirection="column" padding={1}>
      {step === "config" && (
        <ConfigCheck
          apiKey={state.apiKey}
          model={state.model}
          onNext={() => setStep("input")}
          onError={() => exit()}
        />
      )}
      {step === "input" && (
        <InputStep
          onNext={(inputDir, files) => {
            logger.info({ inputDir, fileCount: files.length, files }, "Source directory selected");
            updateState({ inputDir, files });
            setStep("output");
          }}
        />
      )}
      {step === "output" && (
        <OutputStep
          onNext={(outputDir) => {
            logger.info({ outputDir }, "Output directory selected");
            updateState({ outputDir });
            setStep("lang");
          }}
        />
      )}
      {step === "lang" && (
        <LangStep
          onNext={(languages) => {
            logger.info({ languages }, "Target languages selected");
            updateState({ languages });
            setStep("confirm");
          }}
        />
      )}
      {step === "confirm" && (
        <ConfirmStep
          inputDir={state.inputDir}
          outputDir={state.outputDir}
          languages={state.languages}
          files={state.files}
          model={state.model}
          onConfirm={() => {
            const newJobs = buildJobs(state.files, state.languages);
            logger.info({ totalJobs: newJobs.length }, "Translation confirmed, starting");
            setJobs(newJobs);
            setStep("translating");
          }}
          onBack={() => setStep("input")}
        />
      )}
      {step === "translating" && (
        <TranslationView
          key={runKey}
          apiKey={state.apiKey}
          model={state.model}
          inputDir={state.inputDir}
          outputDir={state.outputDir}
          jobs={jobs}
          onDone={(result) => {
            logger.info({ completed: result.completed, failed: result.failed }, "Translation run finished");
            setResults(result);
            setStep("done");
          }}
        />
      )}
      {step === "done" && (
        <DoneView
          completed={results.completed}
          failed={results.failed}
          failedJobs={results.failedJobs}
          onRetry={(retryJobs) => {
            logger.info({ retryCount: retryJobs.length }, "Retrying failed translations");
            setJobs(retryJobs);
            setRunKey((k) => k + 1);
            setStep("translating");
          }}
        />
      )}
    </Box>
  );
}
