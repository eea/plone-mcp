// scripts/fix-type-imports.js
const { Project, SyntaxKind } = require("ts-morph");

async function fixTypeImports() {
  const project = new Project({
    tsconfig: "tsconfig.json", // Ensure this path is correct for your project
  });

  // Get all TypeScript source files in the 'src' directory
  const sourceFiles = project.addSourceFilesAtPaths("src/**/*.ts");

  let changesMade = false;

  for (const sourceFile of sourceFiles) {
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() === SyntaxKind.ImportDeclaration) {
        const importDeclaration = node.asKindOrThrow(SyntaxKind.ImportDeclaration);
        const namedImports = importDeclaration.getNamedImports();

        if (namedImports.length > 0) {
          const typeImports = namedImports.filter(ni => ni.isTypeOnly());
          if (typeImports.length > 0) {
            // Check if there are other non-type imports in the same declaration
            const nonTypeImports = namedImports.filter(ni => !ni.isTypeOnly());

            if (nonTypeImports.length === 0) {
              // All imports are type-only, convert the whole declaration to 'import type'
              importDeclaration.setIsTypeOnly(true);
              typeImports.forEach(ni => ni.setIsTypeOnly(false)); // Remove 'type' keyword from individual specifiers
              changesMade = true;
            } else {
              // Mix of type and non-type imports, extract type-only into a new 'import type' declaration
              const newImportSpecifiers = typeImports.map(ni => ni.getName());
              const moduleSpecifier = importDeclaration.getModuleSpecifier();

              if (newImportSpecifiers.length > 0) {
                // Remove 'type' keyword from original type specifiers
                typeImports.forEach(ni => ni.remove());

                // Create new import type declaration
                const newImportDeclaration = sourceFile.addImportDeclaration({
                  moduleSpecifier: moduleSpecifier.getLiteralValue(),
                  namedImports: newImportSpecifiers,
                  isTypeOnly: true,
                });

                changesMade = true;
              }
            }
          }
        }
      }
    });

    if (changesMade) {
      console.log(`Saving changes to: ${sourceFile.getFilePath()}`);
      await sourceFile.save();
    }
  }

  if (!changesMade) {
    console.log("No type import changes found or applied.");
  } else {
    console.log("Successfully fixed type imports.");
  }
}

fixTypeImports().catch(console.error);
