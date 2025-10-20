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
  ]
});
```

## Features

- Interactive dashboard with metrics and charts
- Filterable test table with sorting
- Detailed test panels with videos/screenshots/traces
- Modern UI with dark/light mode
- Integrated trace viewer (no external dependencies)

## License

MIT
