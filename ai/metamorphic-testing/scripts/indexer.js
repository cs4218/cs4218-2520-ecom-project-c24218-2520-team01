import { Project } from "ts-morph";
import fs from "fs";

// Written by Nicholas Cheng, A0269648H

const INCLUDE = [
    "../../../client/src/**/*.{js,jsx,ts,tsx}",
    "../../../config/**/*.{js,ts}",
    "../../../controllers/**/*.{js,ts}",
    "../../../helpers/**/*.{js,ts}",
    "../../../middlewares/**/*.{js,ts}",
    "../../../models/**/*.{js,ts}",
    "../../../routes/**/*.{js,ts}",
    "../../../server.js",
];

const EXCLUDE = [
    "!../../../tests/**",
    "!../../../client/test/**",
    "!../../../**/*.test.{js,ts,jsx,tsx}",
    "!../../../**/*.spec.{js,ts,jsx,tsx}",
    "!../../../**/*.config.{js,ts,cjs}",
    "!../../../**/configs.js",
    "!../../../**/__tests__/**",
    "!../../../**/__mocks__/**",
    "!../../../**/dist/**",
    "!../../../**/build/**",
    "!../../../node_modules/**",
    "!../../../client/node_modules/**",
];

const project = new Project({
    // If you have a tsconfig, point to it:
    // tsConfigFilePath: "tsconfig.json",

    // Otherwise, use this for plain JS:
    compilerOptions: {
        allowJs: true,
        jsx: 2, // React JSX
    },
});

// Point this at your codebase
project.addSourceFilesAtPaths([...INCLUDE, ...EXCLUDE]);

const index = [];

for (const file of project.getSourceFiles()) {
    const fileEntry = {
        path: file.getFilePath(),
        functions: [],
        classes: [],
        imports: [],
        exports: [],
    };

    // --- Functions ---
    for (const fn of file.getFunctions()) {
        fileEntry.functions.push({
            name: fn.getName(),
            params: fn.getParameters().map(p => ({
                name: p.getName(),
                type: p.getType().getText(),
            })),
            returnType: fn.getReturnType().getText(),
            startLine: fn.getStartLineNumber(),
            endLine: fn.getEndLineNumber(),
        });
    }

    // --- Arrow functions / exported consts ---
    for (const decl of file.getVariableDeclarations()) {
        const init = decl.getInitializer();
        if (init && (init.getKindName() === "ArrowFunction")) {
            fileEntry.functions.push({
                name: decl.getName(),
                kind: "arrow",
                startLine: decl.getStartLineNumber(),
                endLine: decl.getEndLineNumber(),
            });
        }
    }

    // --- Classes ---
    for (const cls of file.getClasses()) {
        fileEntry.classes.push({
            name: cls.getName(),
            methods: cls.getMethods().map(m => ({
                name: m.getName(),
                params: m.getParameters().map(p => p.getName()),
                startLine: m.getStartLineNumber(),
            })),
        });
    }

    // --- Imports ---
    for (const imp of file.getImportDeclarations()) {
        fileEntry.imports.push({
            from: imp.getModuleSpecifierValue(),
            named: imp.getNamedImports().map(n => n.getName()),
            default: imp.getDefaultImport()?.getText(),
        });
    }

    // --- Exports ---
    for (const exp of file.getExportDeclarations()) {
        fileEntry.exports.push({
            from: exp.getModuleSpecifierValue(),
            named: exp.getNamedExports().map(n => n.getName()),
        });
    }

    index.push(fileEntry);
}

// Output the index
fs.writeFileSync("codebase-index.json", JSON.stringify(index, null, 2));
console.log(`Indexed ${index.length} files → codebase-index.json`);