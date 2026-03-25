import { Project, SourceFile } from "ts-morph";
import * as path from "path";

const project = new Project();

// Add all source files from the src directory
project.addSourceFilesAtPaths("src/**/*.ts");

const sourceFiles = project.getSourceFiles();

// The project root is already set to 'src' due to addSourceFilesAtPaths
const srcDirPath = project.getRootDirectories()[0].getPath();


sourceFiles.forEach((sourceFile: SourceFile) => {
  let hasChanges = false;
  sourceFile.getImportDeclarations().forEach((importDeclaration) => {
    const moduleSpecifier = importDeclaration.getModuleSpecifierValue();

    // Only process relative imports
    if (moduleSpecifier.startsWith(".") || moduleSpecifier.startsWith("..")) {
      const currentSourceFilePath = sourceFile.getFilePath();
      const currentDirPath = path.dirname(currentSourceFilePath);
      const absolutePath = path.resolve(currentDirPath, moduleSpecifier);

      // Ensure the absolutePath is within the conceptual src directory
      if (!absolutePath.startsWith(srcDirPath)) {
        console.warn(`Warning: Resolved path "${absolutePath}" is outside of "${srcDirPath}". Skipping import for "${moduleSpecifier}" in "${currentSourceFilePath}".`);
        return;
      }

      // Manually construct the path by removing the srcDirPath prefix
      let relativeToSrcPath = absolutePath.substring(srcDirPath.length);
      // Remove leading slash if present
      if (relativeToSrcPath.startsWith(path.sep)) {
        relativeToSrcPath = relativeToSrcPath.substring(path.sep.length);
      }

      // Form the new module specifier with 'plone-mcp/'
      let newModuleSpecifier = `plone-mcp/${relativeToSrcPath.replace(/\.ts$/, "")}`;
      // Normalize slashes for Windows compatibility
      newModuleSpecifier = newModuleSpecifier.replace(/\\/g, '/');

      // NEW: Remove '/src' if it's immediately after 'plone-mcp/'
      newModuleSpecifier = newModuleSpecifier.replace(/^plone-mcp\/src\//, 'plone-mcp/');


      if (moduleSpecifier !== newModuleSpecifier) {
        importDeclaration.setModuleSpecifier(newModuleSpecifier);
        hasChanges = true;
      }
    }
  });

  if (hasChanges) {
    console.log(`Updated imports in: ${sourceFile.getFilePath()}`);
  }
});

project.saveSync();
console.log("Import transformation complete.");
