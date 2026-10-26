/**
 * Framework guardrails. Run with `npm run validate:framework`.
 * Exits 1 and prints file:line, rule id and a fix hint for every violation.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  REQUIRED_FILES,
  checkEnvHygiene,
  checkHardcodedSecrets,
  checkPackageScripts,
  checkPageFixtureRegistration,
  checkPageObject,
  checkRequiredFiles,
  checkSpecFile,
  type SourceFile,
  type Violation,
} from './framework-rules.ts';

const root = path.resolve(import.meta.dirname, '..');

function listTsFiles(dir: string): string[] {
  const absolute = path.join(root, dir);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) =>
      path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'),
    )
    .sort();
}

function load(relativePath: string): SourceFile {
  return { path: relativePath, text: readFileSync(path.join(root, relativePath), 'utf8') };
}

const violations: Violation[] = [];

const existing = new Set<string>(
  REQUIRED_FILES.filter((file) => existsSync(path.join(root, file))),
);
violations.push(...checkRequiredFiles(existing));
violations.push(...checkPackageScripts(readFileSync(path.join(root, 'package.json'), 'utf8')));

if (existing.has('.gitignore') && existing.has('.env.example')) {
  violations.push(
    ...checkEnvHygiene(
      readFileSync(path.join(root, '.gitignore'), 'utf8'),
      readFileSync(path.join(root, '.env.example'), 'utf8'),
      load('src/config/env.ts'),
    ),
  );
}

const testFiles = listTsFiles('tests');
for (const file of testFiles) {
  if (!file.endsWith('.spec.ts')) {
    violations.push({
      rule: 'spec-location',
      file,
      line: 1,
      message: 'tests/ may only contain *.spec.ts files.',
      fix: 'Move helpers to src/ (data, pages, api or fixtures).',
    });
    continue;
  }
  violations.push(...checkSpecFile(load(file)));
}

const pageFiles = listTsFiles('src/pages');
for (const file of pageFiles) violations.push(...checkPageObject(load(file)));
violations.push(...checkPageFixtureRegistration(pageFiles, load('src/fixtures/test.ts')));

for (const file of [...listTsFiles('src'), ...testFiles, 'playwright.config.ts']) {
  violations.push(...checkHardcodedSecrets(load(file)));
}

const specCount = testFiles.filter((file) => file.endsWith('.spec.ts')).length;
if (violations.length === 0) {
  console.log(
    `validate:framework passed (${specCount} specs, ${pageFiles.length} page files checked).`,
  );
} else {
  for (const v of violations) {
    console.error(`${v.file}:${v.line}  [${v.rule}] ${v.message}\n    fix: ${v.fix}`);
  }
  console.error(`\nvalidate:framework failed with ${violations.length} violation(s).`);
  process.exitCode = 1;
}
