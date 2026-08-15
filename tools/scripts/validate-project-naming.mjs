import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const workspaceRoot = process.cwd();
const scopedLibraryRoots = ['api', 'web'];

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const findProjectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const projectFiles = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      projectFiles.push(...(await findProjectFiles(path)));
      continue;
    }

    if (entry.name === 'project.json') {
      projectFiles.push(path);
    }
  }

  return projectFiles;
};

const errors = [];
const names = new Map();

for (const scope of scopedLibraryRoots) {
  const scopeRoot = join(workspaceRoot, 'libs', scope);
  const projectFiles = await findProjectFiles(scopeRoot);
  const libraryDirectories = (await readdir(scopeRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const registeredLibraries = new Set(
    projectFiles.map(
      (projectFile) => relative(scopeRoot, projectFile).split(sep)[0],
    ),
  );

  for (const libraryDirectory of libraryDirectories) {
    if (!registeredLibraries.has(libraryDirectory)) {
      errors.push(
        `libs/${scope}/${libraryDirectory}: отсутствует project.json для Nx-библиотеки`,
      );
    }
  }

  for (const projectFile of projectFiles) {
    const project = await readJson(projectFile);
    const libraryPath = relative(scopeRoot, join(projectFile, '..'));
    const expectedName = `${scope}-${libraryPath.split(sep).join('-')}`;

    if (project.name !== expectedName) {
      errors.push(
        `${relative(workspaceRoot, projectFile)}: ожидалось name "${expectedName}", получено "${project.name}"`,
      );
    }

    const existingProject = names.get(project.name);
    if (existingProject) {
      errors.push(
        `Nx-проект "${project.name}" объявлен повторно: ${existingProject} и ${relative(workspaceRoot, projectFile)}`,
      );
    } else {
      names.set(project.name, relative(workspaceRoot, projectFile));
    }
  }
}

const tsconfigPath = join(workspaceRoot, 'tsconfig.base.json');
const tsconfig = await readJson(tsconfigPath);
const aliases = Object.keys(tsconfig.compilerOptions?.paths ?? {});

for (const scope of scopedLibraryRoots) {
  const duplicatedScope = `@wm/${scope}/${scope}-`;
  const invalidAliases = aliases.filter((alias) =>
    alias.startsWith(duplicatedScope),
  );

  for (const alias of invalidAliases) {
    errors.push(
      `tsconfig.base.json: алиас "${alias}" повторяет область "${scope}"`,
    );
  }
}

if (errors.length > 0) {
  console.error(
    `Нарушены правила именования Nx-проектов:\n- ${errors.join('\n- ')}`,
  );
  process.exitCode = 1;
} else {
  console.log('Именование Nx-проектов и импортов корректно.');
}
