/**
 * Project-specific architecture rules that ESLint cannot express.
 * Every rule works on the TypeScript AST (never on raw text), so comments and
 * string contents cannot trigger false positives. Rules are pure functions so
 * they can be unit-tested in framework-rules.test.ts.
 */
import ts from 'typescript';

export interface Violation {
  readonly rule: string;
  readonly file: string;
  readonly line: number;
  readonly message: string;
  readonly fix: string;
}

export interface SourceFile {
  /** Repository-relative POSIX path, e.g. "tests/ui/checkout.spec.ts". */
  readonly path: string;
  readonly text: string;
}

const FIXTURES_MODULE = 'src/fixtures/test.ts';
const SECRET_NAME = /(password|passwd|secret|token|api[-_]?key|auth[-_]?key|bearer)/i;
const LOCATOR_METHODS = new Set([
  'locator',
  'getByRole',
  'getByText',
  'getByTestId',
  'getByLabel',
  'getByPlaceholder',
  'getByAltText',
  'getByTitle',
  '$',
  '$$',
]);
const TEST_FUNCTIONS = new Set([
  'test',
  'beforeEach',
  'afterEach',
  'beforeAll',
  'afterAll',
  'step',
]);
const BROWSER_FIXTURES = ['page', 'context', 'browser'];

export const REQUIRED_FILES = [
  'README.md',
  'AGENTS.md',
  'DECISIONS.md',
  'AI_USAGE.md',
  '.env.example',
  '.gitignore',
  'playwright.config.ts',
  'tsconfig.json',
  'eslint.config.mjs',
  'allurerc.mjs',
  FIXTURES_MODULE,
] as const;

/** Script name -> substrings its command must contain. */
export const REQUIRED_SCRIPTS: Readonly<Record<string, readonly string[]>> = {
  test: ['playwright test'],
  'test:ui': ['playwright test', '--project=ui'],
  'test:api': ['playwright test', '--project=api'],
  'test:headed': ['--headed'],
  'test:debug': ['--debug'],
  'test:report': ['show-report'],
  'test:allure': ['allure run', 'playwright test'],
  'allure:generate': ['allure generate'],
  'allure:open': ['allure open'],
  typecheck: ['tsc --noEmit'],
  lint: ['eslint'],
  'format:check': ['prettier --check'],
  'validate:framework': ['validate-framework.ts'],
  validate: ['typecheck', 'lint', 'format:check', 'validate:framework'],
};

function parse(file: SourceFile): ts.SourceFile {
  return ts.createSourceFile(file.path, file.text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node);
  ts.forEachChild(node, (child) => {
    walk(child, visit);
  });
}

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.phaseModifier === ts.SyntaxKind.TypeKeyword) return true;
  const bindings = clause.namedBindings;
  return (
    clause.name === undefined &&
    bindings !== undefined &&
    ts.isNamedImports(bindings) &&
    bindings.elements.every((element) => element.isTypeOnly)
  );
}

function importSpecifier(node: ts.ImportDeclaration): string {
  return ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : '';
}

/** Resolves a relative import against the importing file to a repo-relative path. */
function resolveImport(fromPath: string, specifier: string): string {
  if (!specifier.startsWith('.')) return specifier;
  const parts = fromPath.split('/').slice(0, -1);
  for (const segment of specifier.split('/')) {
    if (segment === '..') parts.pop();
    else if (segment !== '.') parts.push(segment);
  }
  return parts.join('/');
}

function propertyName(name: ts.PropertyName | ts.BindingName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return undefined;
}

/** Fixture names destructured by the first parameter of a test/hook callback. */
function destructuredFixtures(fn: ts.SignatureDeclarationBase): string[] {
  const first = fn.parameters[0];
  if (!first || !ts.isObjectBindingPattern(first.name)) return [];
  return first.name.elements.flatMap((element) => {
    const name = propertyName(element.propertyName ?? element.name);
    return name === undefined ? [] : [name];
  });
}

function calleeName(call: ts.CallExpression): string | undefined {
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return callee.text;
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  return undefined;
}

// ---------------------------------------------------------------------------
// Spec rules
// ---------------------------------------------------------------------------

export function checkSpecFile(file: SourceFile): Violation[] {
  const violations: Violation[] = [];
  const add = (rule: string, line: number, message: string, fix: string): void => {
    violations.push({ rule, file: file.path, line, message, fix });
  };

  const isUi = file.path.startsWith('tests/ui/');
  const isApi = file.path.startsWith('tests/api/');
  if (!isUi && !isApi) {
    add('spec-location', 1, 'Spec files must live in tests/ui/ or tests/api/.', 'Move the file.');
  }
  if (isApi && !file.path.endsWith('.api.spec.ts')) {
    add('spec-naming', 1, 'API specs must be named <feature>.api.spec.ts.', 'Rename the file.');
  }

  const source = parse(file);
  let importsFixtures = false;

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const specifier = importSpecifier(statement);
    const resolved = resolveImport(file.path, specifier);
    const line = lineOf(source, statement);

    if (resolved === FIXTURES_MODULE) importsFixtures = true;
    if (isTypeOnlyImport(statement)) continue;

    if (specifier === '@playwright/test') {
      add(
        'spec-uses-fixtures',
        line,
        'Specs must import `test`/`expect` from src/fixtures/test.ts, not @playwright/test.',
        `import { expect, test } from '<relative path>/${FIXTURES_MODULE}';`,
      );
    } else if (resolved.startsWith('src/pages/') || resolved.startsWith('src/api/')) {
      add(
        'spec-no-manual-construction',
        line,
        `Specs must not construct page objects or API clients (imported ${specifier}).`,
        'Request the object as a fixture; register new ones in src/fixtures/test.ts.',
      );
    } else if (specifier.startsWith('allure-') || specifier === 'allure') {
      add(
        'spec-reporter-agnostic',
        line,
        `Specs must not depend on the reporter (imported ${specifier}).`,
        'Use reportMetadata() from src/reporting/report-metadata.ts and test.step().',
      );
    }
  }

  if (!importsFixtures) {
    add(
      'spec-uses-fixtures',
      1,
      'Spec does not import the project fixtures.',
      `import { expect, test } from '<relative path>/${FIXTURES_MODULE}';`,
    );
  }

  walk(source, (node) => {
    if (!ts.isCallExpression(node)) return;
    const name = calleeName(node);

    if (
      name !== undefined &&
      LOCATOR_METHODS.has(name) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      add(
        'spec-no-raw-locators',
        lineOf(source, node),
        `Locator call .${name}() in a spec. Locators belong in page objects.`,
        'Expose a Locator or an action on the relevant page object/component.',
      );
    }

    if (name === undefined || !TEST_FUNCTIONS.has(name)) return;
    for (const arg of node.arguments) {
      if (!ts.isArrowFunction(arg) && !ts.isFunctionExpression(arg)) continue;
      const fixtures = destructuredFixtures(arg);
      if (fixtures.includes('request')) {
        add(
          'spec-uses-api-client',
          lineOf(source, arg),
          'Specs must not use the raw `request` fixture.',
          'Use the `api` fixture; add missing endpoints to src/api/automation-exercise-api.ts.',
        );
      }
      if (isApi) {
        for (const fixture of fixtures.filter((f) => BROWSER_FIXTURES.includes(f))) {
          add(
            'api-spec-no-browser',
            lineOf(source, arg),
            `API spec requests the browser fixture \`${fixture}\`.`,
            'API specs may only use `api` and data fixtures. Move browser checks to tests/ui/.',
          );
        }
      }
    }
  });

  return violations;
}

// ---------------------------------------------------------------------------
// Source rules
// ---------------------------------------------------------------------------

/** Flags string literals assigned to secret-looking names. Computed values are allowed. */
export function checkHardcodedSecrets(file: SourceFile): Violation[] {
  const source = parse(file);
  const violations: Violation[] = [];

  const check = (
    name: string | undefined,
    value: ts.Expression | undefined,
    node: ts.Node,
  ): void => {
    if (name === undefined || value === undefined || !SECRET_NAME.test(name)) return;
    const isLiteral = ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value);
    if (!isLiteral || value.text === '') return;
    violations.push({
      rule: 'no-hardcoded-secrets',
      file: file.path,
      line: lineOf(source, node),
      message: `"${name}" is assigned a hard-coded string literal.`,
      fix: 'Generate it (see src/data/user-factory.ts) or read it from an environment variable.',
    });
  };

  walk(source, (node) => {
    if (ts.isVariableDeclaration(node)) check(propertyName(node.name), node.initializer, node);
    else if (ts.isPropertyAssignment(node)) check(propertyName(node.name), node.initializer, node);
    else if (ts.isPropertyDeclaration(node)) check(propertyName(node.name), node.initializer, node);
    else if (ts.isParameter(node)) check(propertyName(node.name), node.initializer, node);
    else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      (ts.isIdentifier(node.left) || ts.isPropertyAccessExpression(node.left))
    ) {
      const name = ts.isIdentifier(node.left) ? node.left.text : node.left.name.text;
      check(name, node.right, node);
    }
  });
  return violations;
}

/** Page objects describe the page; specs decide what is correct. */
export function checkPageObject(file: SourceFile): Violation[] {
  const source = parse(file);
  const violations: Violation[] = [];
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || isTypeOnlyImport(statement)) continue;
    const bindings = statement.importClause?.namedBindings;
    const importsExpect =
      bindings !== undefined &&
      ts.isNamedImports(bindings) &&
      bindings.elements.some((element) => element.name.text === 'expect');
    if (importsExpect) {
      violations.push({
        rule: 'page-object-no-assertions',
        file: file.path,
        line: lineOf(source, statement),
        message: 'Page objects and components must not import `expect`.',
        fix: 'Expose a Locator and assert in the spec. Use locator.waitFor() for synchronisation.',
      });
    }
  }
  return violations;
}

/** Every page object under src/pages/ (not components) must be provided by a fixture. */
export function checkPageFixtureRegistration(
  pageFiles: readonly string[],
  fixtures: SourceFile,
): Violation[] {
  const source = parse(fixtures);
  const imported = new Set(
    source.statements
      .filter(ts.isImportDeclaration)
      .map((statement) => resolveImport(fixtures.path, importSpecifier(statement))),
  );
  return pageFiles
    .filter((path) => !path.startsWith('src/pages/components/') && !imported.has(path))
    .map((path) => ({
      rule: 'page-object-has-fixture',
      file: path,
      line: 1,
      message: 'Page object is not registered as a fixture.',
      fix: `Add it to PageFixtures and test.extend() in ${FIXTURES_MODULE}.`,
    }));
}

// ---------------------------------------------------------------------------
// Repository rules
// ---------------------------------------------------------------------------

export function checkRequiredFiles(existing: ReadonlySet<string>): Violation[] {
  return REQUIRED_FILES.filter((path) => !existing.has(path)).map((path) => ({
    rule: 'required-file',
    file: path,
    line: 1,
    message: 'Required file is missing.',
    fix: 'Restore it; see AGENTS.md for what each file must contain.',
  }));
}

export function checkPackageScripts(packageJson: string): Violation[] {
  const scripts = (JSON.parse(packageJson) as { scripts?: Record<string, string> }).scripts ?? {};
  return Object.entries(REQUIRED_SCRIPTS).flatMap(([name, fragments]) => {
    const command = scripts[name];
    const missing = fragments.filter((fragment) => !command?.includes(fragment));
    if (missing.length === 0) return [];
    return [
      {
        rule: 'required-script',
        file: 'package.json',
        line: 1,
        message:
          command === undefined
            ? `npm script "${name}" is missing.`
            : `npm script "${name}" must contain: ${missing.join(', ')}.`,
        fix: 'Restore the script; see README.md "Commands".',
      },
    ];
  });
}

export function checkEnvHygiene(
  gitignore: string,
  envExample: string,
  envModule: SourceFile,
): Violation[] {
  const violations: Violation[] = [];
  const ignored = gitignore.split(/\r?\n/).map((line) => line.trim());
  if (!ignored.includes('.env')) {
    violations.push({
      rule: 'env-hygiene',
      file: '.gitignore',
      line: 1,
      message: '.env is not git-ignored.',
      fix: 'Add a line containing exactly ".env".',
    });
  }

  const exampleKeys = new Map<string, { value: string; line: number }>();
  envExample.split(/\r?\n/).forEach((raw, index) => {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=(.*)$/.exec(raw);
    if (match?.[1] !== undefined)
      exampleKeys.set(match[1], { value: (match[2] ?? '').trim(), line: index + 1 });
  });

  for (const [key, { value, line }] of exampleKeys) {
    if (SECRET_NAME.test(key) && value !== '') {
      violations.push({
        rule: 'env-hygiene',
        file: '.env.example',
        line,
        message: `${key} looks like a secret but has a value in .env.example.`,
        fix: 'Leave secret values empty in .env.example.',
      });
    }
  }

  const readKeys = new Set<string>();
  walk(parse(envModule), (node) => {
    if (ts.isStringLiteral(node) && /^[A-Z][A-Z0-9_]+$/.test(node.text)) readKeys.add(node.text);
  });
  for (const key of readKeys) {
    if (!exampleKeys.has(key)) {
      violations.push({
        rule: 'env-documented',
        file: '.env.example',
        line: 1,
        message: `${envModule.path} reads ${key}, but .env.example does not document it.`,
        fix: `Add ${key}= with a comment to .env.example.`,
      });
    }
  }
  for (const [key, { line }] of exampleKeys) {
    if (!readKeys.has(key)) {
      violations.push({
        rule: 'env-documented',
        file: '.env.example',
        line,
        message: `${key} is documented but never read by ${envModule.path}.`,
        fix: 'Remove it from .env.example or read it in the env module.',
      });
    }
  }
  return violations;
}
