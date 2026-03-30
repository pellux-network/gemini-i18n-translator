import { useState, useEffect } from "react";
import { readdir, stat } from "fs/promises";
import { resolve, dirname, basename, join } from "path";

export function usePathSuggestions(value: string): string[] {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function computeSuggestions() {
      if (!value) {
        setSuggestions([]);
        return;
      }

      try {
        const resolved = resolve(value);

        // Check if value ends with / — list contents of that directory
        // Otherwise list siblings matching the partial basename
        const isDir = value.endsWith("/");
        const parentDir = isDir ? resolved : dirname(resolved);
        const prefix = isDir ? "" : basename(resolved);

        const entries = await readdir(parentDir);
        const matches: string[] = [];

        for (const entry of entries) {
          if (prefix && !entry.toLowerCase().startsWith(prefix.toLowerCase())) {
            continue;
          }

          const fullPath = join(parentDir, entry);
          try {
            const s = await stat(fullPath);
            if (s.isDirectory()) {
              // Return path relative to cwd for cleaner display
              const relative = value.endsWith("/")
                ? value + entry
                : value.slice(0, value.length - prefix.length) + entry;
              matches.push(relative);
            }
          } catch {
            // skip inaccessible entries
          }
        }

        if (!cancelled) {
          setSuggestions(matches.slice(0, 10));
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      }
    }

    computeSuggestions();
    return () => {
      cancelled = true;
    };
  }, [value]);

  return suggestions;
}
