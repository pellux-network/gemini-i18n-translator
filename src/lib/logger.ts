import pino from "pino";
import { mkdirSync, readdirSync, unlinkSync } from "fs";
import { join, resolve } from "path";

const LOG_DIR = resolve("logs");
const MAX_LOG_FILES = 10;

// Ensure log directory exists
mkdirSync(LOG_DIR, { recursive: true });

// Clean up old log files beyond MAX_LOG_FILES
function pruneOldLogs() {
  try {
    const files = readdirSync(LOG_DIR)
      .filter((f) => f.endsWith(".log"))
      .sort()
      .reverse();

    for (const file of files.slice(MAX_LOG_FILES)) {
      unlinkSync(join(LOG_DIR, file));
    }
  } catch {
    // ignore cleanup errors
  }
}

pruneOldLogs();

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logFile = join(LOG_DIR, `${timestamp}.log`);

const logger = pino(
  {
    level: "debug",
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  },
  pino.destination({ dest: logFile, sync: false })
);

export { logFile };
export default logger;
