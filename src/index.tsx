#!/usr/bin/env bun
import React from "react";
import { render } from "ink";
import { App } from "./ui/App.js";
import logger, { logFile } from "./lib/logger.js";

// Route rogue console output (e.g. from Gemini SDK) to the log file
// instead of letting it leak through Ink's patchConsole as static text
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
console.error = (...args: unknown[]) => {
  logger.error({ consoleError: args.map(String).join(" ") }, "Captured console.error");
};
console.warn = (...args: unknown[]) => {
  logger.warn({ consoleWarn: args.map(String).join(" ") }, "Captured console.warn");
};

// Prevent unhandled rejections from leaking to the terminal
process.on("unhandledRejection", (err) => {
  logger.error({ error: String(err) }, "Unhandled rejection");
});

logger.info({ logFile }, "Session started");

const instance = render(<App />, { patchConsole: false });
await instance.waitUntilExit();

// Restore console after Ink exits
console.error = originalConsoleError;
console.warn = originalConsoleWarn;

logger.info("Session ended");
