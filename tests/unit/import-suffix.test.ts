import { describe, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

describe("Import Path Suffixes", () => {
  it("should not contain '.js' suffix in import paths of TypeScript files", () => {
    const collectTsFiles = (dir: string): string[] => {
      const entries = readdirSync(dir, { withFileTypes: true });
      return entries.flatMap((entry) => {
        const entryPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          return collectTsFiles(entryPath);
        }

        return entry.isFile() && entry.name.endsWith(".ts") ? [entryPath] : [];
      });
    };

    const tsFiles = collectTsFiles(path.join(process.cwd(), "src"));
    const filesWithJSSuffix: string[] = [];

    tsFiles.forEach((file) => {
      const content = readFileSync(file, "utf-8");
      // Regex to find import/export statements with '.js' or '.cjs' or '.mjs' suffix
      const regex =
        /(?:import|export)\s(?:.*?)\sfrom\s+['"].*\.(js|cjs|mjs)['"].*;/g;
      if (regex.test(content)) {
        filesWithJSSuffix.push(file);
      }
    });

    if (filesWithJSSuffix.length > 0) {
      const errorMessage =
        "The following TypeScript files contain '.js', '.cjs', or '.mjs' suffixes in their import/export paths:\n" +
        filesWithJSSuffix.map((file) => `- ${file}`).join("\n");
      throw new Error(errorMessage);
    }
  });
});
