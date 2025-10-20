import { DataCollector, ReporterOptions } from "../collector/data-collector";
import { ReportData } from "../types";
import * as fs from "fs";
import * as path from "path";
import * as childProcess from "child_process";

export class PlaywrightCustomReporter extends DataCollector {
  constructor(options: ReporterOptions = {}) {
    super(options);
  }

  async onEnd(result: any): Promise<void> {
    // Appeler la méthode parent pour collecter les données
    super.onEnd(result);

    // Générer le rapport HTML
    await this.generateHTMLReport();

    // Ouvrir le rapport si demandé
    if (this.shouldOpenReport(result)) {
      await this.openReport();
    }
  }

  private async generateHTMLReport(): Promise<void> {
    const reportData = this.getReportData();

    try {
      // Créer le répertoire de sortie s'il n'existe pas
      const outputDir = reportData.config.outputDir;
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Copier les assets du bundle web
      await this.copyWebAssets(outputDir);

      // Générer le HTML avec les données injectées
      const htmlContent = this.generateHTML(reportData);

      // Sauvegarder le fichier HTML
      const htmlPath = path.join(outputDir, "index.html");
      fs.writeFileSync(htmlPath, htmlContent);

      console.log(`✅ Custom report generated: ${htmlPath}`);
      console.log("");
      console.log("📊 To view your report with working trace viewer, run:");
      console.log("   npm run show-report");
      console.log("");
      console.log("Or manually:");
      console.log(`   cd ${outputDir}`);
      console.log("   npx serve -s . -p 3737");
      console.log("   # Then open http://localhost:3737");

      return;
    } catch (error) {
      console.error("Failed to generate HTML report:", error);
    }
  }

  private async copyWebAssets(outputDir: string): Promise<void> {
    const webDistPath = path.join(__dirname, "../web");
    const targetPath = path.join(outputDir, "assets");

    // Créer le répertoire assets
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    try {
      console.log(`📦 Copying web assets from: ${webDistPath}`);
      console.log(`📁 Target directory: ${targetPath}`);

      // Copier le bundle JavaScript
      const bundlePath = path.join(webDistPath, "bundle.js");
      console.log(`🔍 Looking for bundle at: ${bundlePath}`);

      if (fs.existsSync(bundlePath)) {
        fs.copyFileSync(bundlePath, path.join(targetPath, "bundle.js"));
        console.log(`✅ Copied bundle.js`);
      } else {
        console.warn(`⚠️  Bundle not found at: ${bundlePath}`);
      }

      // Copier le visualiseur de traces complet de Playwright
      await this.copyTraceViewer(outputDir);

      // Copier d'autres assets si ils existent
      const files = ["bundle.css", "bundle.js.map", "bundle.js.LICENSE.txt"];
      files.forEach((file) => {
        const srcPath = path.join(webDistPath, file);
        const destPath = path.join(targetPath, file);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`✅ Copied ${file}`);
        }
      });
    } catch (error) {
      console.warn("Failed to copy some web assets:", error);
    }
  }

  private async copyTraceViewer(outputDir: string): Promise<void> {
    try {
      // Trouver le répertoire du visualiseur de traces de Playwright
      const playwrightCore = require.resolve("playwright-core/package.json");
      const playwrightDir = path.dirname(playwrightCore);
      const traceViewerPath = path.join(
        playwrightDir,
        "lib",
        "vite",
        "traceViewer"
      );

      if (!fs.existsSync(traceViewerPath)) {
        console.warn("⚠️  Playwright trace viewer not found, skipping...");
        return;
      }

      const traceDir = path.join(outputDir, "trace");

      // Créer le répertoire trace
      if (!fs.existsSync(traceDir)) {
        fs.mkdirSync(traceDir, { recursive: true });
      }

      // Copier tous les fichiers du visualiseur de traces
      this.copyDirectoryRecursive(traceViewerPath, traceDir);
      console.log(`✅ Copied trace viewer from Playwright`);
    } catch (error) {
      console.warn("Failed to copy trace viewer:", error);
    }
  }

  private copyDirectoryRecursive(src: string, dest: string): void {
    if (!fs.existsSync(src)) return;

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);

    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);

      const stat = fs.statSync(srcPath);

      if (stat.isDirectory()) {
        this.copyDirectoryRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  private generateHTML(reportData: ReportData): string {
    const title = reportData.config.title || "Playwright Test Report";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    /* Inline critical CSS for loading state */
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #ffffff;
      color: #1e293b;
    }
    
    .loading-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 2rem;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e2e8f0;
      border-top: 4px solid #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    #root:empty::after {
      content: "";
      display: block;
    }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading-screen">
      <div class="loading-spinner"></div>
      <p>Loading test report...</p>
    </div>
  </div>
  
  <!-- Report data injection -->
  <script id="report-data" type="application/json">
${JSON.stringify(reportData, null, 2)}
  </script>
  
  <!-- Load the React application -->
  <script src="./assets/bundle.js"></script>
</body>
</html>`;
  }

  private shouldOpenReport(result: any): boolean {
    const options = this.options as ReporterOptions;

    switch (options.open) {
      case "always":
        return true;
      case "never":
        return false;
      case "on-failure":
        return result.status !== "passed";
      default:
        return false;
    }
  }

  private async openReport(): Promise<void> {
    const reportData = this.getReportData();
    const outputDir = reportData.config.outputDir;

    try {
      // Démarrer le serveur HTTP au lieu d'ouvrir directement le fichier
      console.log("🚀 Starting report server...");

      // Utiliser ts-node ou node pour démarrer le serveur
      const serverScript = path.resolve(__dirname, "../server/serve-report.js");
      const tsServerScript = path.resolve(
        __dirname,
        "../server/serve-report.ts"
      );

      let serverProcess;
      if (fs.existsSync(serverScript)) {
        // Version compilée
        serverProcess = childProcess.spawn("node", [serverScript, outputDir], {
          detached: true,
          stdio: "inherit",
        });
      } else if (fs.existsSync(tsServerScript)) {
        // Version TypeScript (développement)
        serverProcess = childProcess.spawn(
          "npx",
          ["ts-node", tsServerScript, outputDir],
          {
            detached: true,
            stdio: "inherit",
          }
        );
      } else {
        // Fallback: ouvrir le fichier HTML directement
        const htmlPath = path.join(outputDir, "index.html");
        const command =
          process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
            ? "start"
            : "xdg-open";

        childProcess.spawn(command, [htmlPath], {
          detached: true,
          stdio: "ignore",
        });
        console.log(`📖 Opening report: ${htmlPath}`);
        console.log(
          "⚠️  Note: For optimal experience with traces, use 'npm run show-report'"
        );
        return;
      }

      // Attendre un peu que le serveur démarre
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Ouvrir le navigateur sur localhost:3737
      const url = "http://localhost:3737";
      const command =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
          ? "start"
          : "xdg-open";

      childProcess.spawn(command, [url], {
        detached: true,
        stdio: "ignore",
      });

      console.log(`🌐 Report server started at: ${url}`);
      console.log("📊 Opening report in browser...");
      console.log(
        "💡 Tip: The server will keep running in background. Use Ctrl+C to stop it if needed."
      );
    } catch (error) {
      console.warn("Failed to start report server:", error);
      // Fallback vers l'ouverture directe du fichier
      const htmlPath = path.join(outputDir, "index.html");
      console.log(`📖 Fallback: Report available at: ${htmlPath}`);
    }
  }
}

// Export des types et utilitaires
export * from "../types";
export { DataCollector } from "../collector/data-collector";
export type { ReporterOptions };
