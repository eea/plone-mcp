import { Project } from "ts-morph";
import * as path from "path";

const project = new Project();

// Add all source files from the src directory
project.addSourceFilesAtPaths("src/**/*.ts");

console.log(`Project Root (from getRootDirectories): ${project.getRootDirectories()[0].getPath()}`);
console.log(`__dirname: ${__dirname}`);
console.log(`path.resolve(__dirname, '../../src'): ${path.resolve(__dirname, '../../src')}`);

// This is just for debugging; will remove or correct later
const srcDirPath = path.resolve(project.getRootDirectories()[0].getPath(), 'src');
console.log(`Calculated srcDirPath (incorrectly): ${srcDirPath}`);
