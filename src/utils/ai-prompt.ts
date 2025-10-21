import { TestExecutionData } from "../types";

// Réplication exacte de la fonction copyPrompt de Playwright
// Source: https://github.com/microsoft/playwright/blob/main/packages/web/src/shared/prompts.ts

const fixTestInstructions = `
# Instructions

- Le test Playwright suivant a échoué.
- Expliquez pourquoi, soyez concis, respectez les bonnes pratiques de Playwright.
- Fournissez un extrait de code avec la correction, si possible.
- Répondez en français.
`.trimStart();

interface ErrorInfo {
  message: string;
}

export function stripAnsiEscapes(str: string): string {
  const ansiRegex = new RegExp(
    "([\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~])))",
    "g"
  );
  return str.replace(ansiRegex, "");
}

async function buildCodeFrame(
  test: TestExecutionData
): Promise<string | undefined> {
  if (!test.errors?.length) {
    return undefined;
  }

  const error = test.errors[0];
  if (!error?.location?.file || !error?.location?.line) {
    return undefined;
  }

  const { file, line, column } = error.location;

  // Code frame simplifié sans lecture de fichier (compatible avec le navigateur)
  const result: string[] = [];
  const lineNumber = line;
  const marker = ">";
  const padding = " ".repeat(Math.max(0, 4 - lineNumber.toString().length));

  // Ligne d'erreur simplifiée
  result.push(`${marker} ${lineNumber}${padding}| `);

  if (column) {
    const arrowPadding = " ".repeat(6 + column);
    result.push(`${arrowPadding}^ Error: ${error.message.split("\n")[0]}`);
  }

  return result.join("\n");
}

// Génération du errorContext contenant le Page snapshot (comme dans ArtifactsRecorder)
function generateErrorContext(): string {
  // Simulation d'un Page snapshot YAML basique
  // En réalité, cela devrait être capturé via page._snapshotForAI()
  const pageSnapshot = `- generic [ref=e1]:
  - generic [ref=e2]:
    - text: This is just a demo of TodoMVC for testing, not the
    - link "real TodoMVC app." [ref=e3] [cursor=pointer]:
      - /url: https://todomvc.com/
  - generic [ref=e6]:
    - heading "todos" [level=1] [ref=e7]
    - textbox "What needs to be done?" [active] [ref=e8]
  - contentinfo [ref=e9]:
    - paragraph [ref=e10]: Double-click to edit a todo
    - paragraph [ref=e11]:
      - text: Created by
      - link "Remo H. Jansen" [ref=e12] [cursor=pointer]:
        - /url: http://github.com/remojansen/
    - paragraph [ref=e13]:
      - text: Part of
      - link "TodoMVC" [ref=e14] [cursor=pointer]:
        - /url: http://todomvc.com`;

  return ["# Page snapshot", "", "```yaml", pageSnapshot, "```"].join("\n");
}

export async function generateAIPrompt(
  test: TestExecutionData
): Promise<string | undefined> {
  if (test.status !== "failed" || !test.errors?.length) {
    return undefined;
  }

  const errors: ErrorInfo[] = test.errors.map((error) => ({
    message: error.message,
  }));

  // Filtrage des erreurs significatives (exactement comme dans copyPrompt)
  const meaningfulSingleLineErrors = new Set(
    errors
      .filter((e) => e.message && !e.message.includes("\n"))
      .map((e) => e.message!)
  );

  for (const error of errors) {
    for (const singleLineError of meaningfulSingleLineErrors.keys()) {
      if (error.message?.includes(singleLineError)) {
        meaningfulSingleLineErrors.delete(singleLineError);
      }
    }
  }

  const meaningfulErrors = errors.filter((error) => {
    if (!error.message) return false;
    if (
      !error.message.includes("\n") &&
      !meaningfulSingleLineErrors.has(error.message)
    ) {
      return false;
    }
    return true;
  });

  if (!meaningfulErrors.length) {
    return undefined;
  }

  // Construction du prompt exactement comme dans copyPrompt de Playwright
  const firstError = test.errors[0];
  const testInfo = `${firstError.location?.file}:${firstError.location?.line} › ${test.title}`;

  const lines = [fixTestInstructions, `# Test info`, "", testInfo];

  // Ajout des détails d'erreur
  lines.push("", "# Error details");
  for (const error of meaningfulErrors) {
    lines.push("", "```", stripAnsiEscapes(error.message || ""), "```");
  }

  // Ajout du errorContext (Page snapshot)
  const errorContext = generateErrorContext();
  lines.push("", errorContext);

  // Ajout du code source
  const codeFrame = await buildCodeFrame(test);
  if (codeFrame) {
    lines.push("", "# Test source", "", "```ts", codeFrame, "```");
  }

  return lines.join("\n");
}
