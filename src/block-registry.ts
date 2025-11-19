import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load block specifications from JSON
export const blocksSpecification = (() => {
  try {
    return JSON.parse(readFileSync(join(__dirname, "blocks.json"), "utf-8"));
  } catch (error) {
    console.error("Error loading blocks specification:", error);
    return;
  }
})();

/**
 * BlockRegistry for centralizing block type management
 */
export class BlockRegistry {
  private specifications: Record<string, unknown>;

  constructor(specs: Record<string, unknown>) {
    this.specifications = specs;
  }

  getBlockTypes(): string[] {
    return Object.keys(this.specifications);
  }

  getBlockTypesEnum(): [string, ...string[]] {
    const types = this.getBlockTypes();
    if (types.length === 0) {
      throw new Error("No block types available");
    }
    return types as [string, ...string[]];
  }

  getSpecifications(): Record<string, unknown> {
    return this.specifications;
  }

  getSpecification(blockType: string): unknown {
    return this.specifications[blockType];
  }
}

// Initialize block registry
export const blockRegistry = new BlockRegistry(blocksSpecification);
