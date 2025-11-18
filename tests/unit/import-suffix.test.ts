import { describe, it } from "vitest";
import { readFileSync } from "fs";
import { globSync } from "glob";

describe("Import Path Suffixes", () => {
  it("should not contain '.js' suffix in import paths of TypeScript files", () => {
    const tsFiles = globSync("src/**/*.ts", { ignore: ["node_modules/**"] });
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
