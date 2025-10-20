# @naamedi/playwright-reporter

A custom reporter for Playwright with dashboard, detailed test results, and modern UI.

## Installation

```bash
npm install @naamedi/playwright-reporter
```

## Usage

In your `playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    [
      "@naamedi/playwright-reporter",
      {
        outputDir: "./custom-report",
        title: "Test Report",
        open: "on-failure",
      },
    ],
  ],
});
```

## Features

- Interactive dashboard with metrics and charts
- Filterable test table with sorting
- Detailed test panels with videos/screenshots/traces
- Modern UI with dark/light mode
- Integrated trace viewer (no external dependencies)

## CLI - Serveur de développement

### Commande courte (recommandée)

```bash
# Auto-détection du répertoire de rapport
npx pw-serve

# Spécifier un répertoire
npx pw-serve ./custom-report

# Utiliser un port personnalisé
npx pw-serve -p 4000
```

### Installation globale (encore plus court)

```bash
# Installation
npm install -g @naamedi/playwright-reporter

# Utilisation
pw-serve
pw-serve ./custom-report
pw-serve -p 4000
```

### Commande complète (alternative)

```bash
npx @naamedi/playwright-reporter serve
npx @naamedi/playwright-reporter --help
```

## License

MIT
