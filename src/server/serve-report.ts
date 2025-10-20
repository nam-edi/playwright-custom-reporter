#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as http from "http";

// Fonction pour détecter le type MIME
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".ttf": "font/ttf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".zip": "application/zip",
    ".webm": "video/webm",
    ".mp4": "video/mp4",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

function findReportDirectory(): string | null {
  const currentDir = process.cwd();

  // Option 1: Chercher les fichiers de configuration Playwright
  const configFiles = [
    "playwright.config.ts",
    "playwright.config.js",
    "example.playwright.config.ts",
    "example.playwright.config.js",
  ];

  for (const configFile of configFiles) {
    const configPath = path.join(currentDir, configFile);
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, "utf8");
        // Chercher outputDir dans le contenu du fichier
        const outputDirMatch = configContent.match(
          /outputDir:\s*["']([^"']+)["']/
        );
        if (outputDirMatch) {
          const outputDir = path.resolve(currentDir, outputDirMatch[1]);
          if (fs.existsSync(outputDir)) {
            console.log(`📄 Found outputDir in ${configFile}: ${outputDir}`);
            return outputDir;
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not parse ${configFile}:`, error);
      }
    }
  }

  // Option 2: Fallbacks (répertoires standards)
  const fallbackDirs = [
    path.join(currentDir, "example", "custom-report"),
    path.join(currentDir, "custom-report"),
    path.join(currentDir, "test-results", "custom-report"),
    path.join(currentDir, "playwright-report"),
  ];

  for (const dir of fallbackDirs) {
    if (fs.existsSync(dir)) {
      console.log(`📁 Using fallback directory: ${dir}`);
      return dir;
    }
  }

  return null;
}

function createServer(reportDir: string) {
  const connections = new Set<any>();

  const server = http.createServer((req, res) => {
    try {
      // Nettoyer l'URL et décoder les caractères spéciaux
      const fullUrl = req.url || "/";
      let urlPath = fullUrl.split("?")[0]; // Séparer le chemin des paramètres de requête
      urlPath = decodeURIComponent(urlPath);

      // Rediriger la racine vers index.html
      if (urlPath === "/" || urlPath === "") {
        urlPath = "/index.html";
      }

      console.log(`📡 ${req.method} ${fullUrl} -> ${urlPath}`);

      // Construire le chemin du fichier
      const filePath = path.join(reportDir, urlPath.substring(1));

      // Vérifier que le fichier est dans le répertoire autorisé (sécurité)
      const normalizedFilePath = path.normalize(filePath);
      const normalizedReportDir = path.normalize(reportDir);

      if (!normalizedFilePath.startsWith(normalizedReportDir)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      // Vérifier si le fichier existe
      if (!fs.existsSync(normalizedFilePath)) {
        res.writeHead(404);
        res.end(`File not found: ${urlPath}`);
        return;
      }

      // Lire et servir le fichier
      const stat = fs.statSync(normalizedFilePath);

      if (stat.isDirectory()) {
        // Si c'est un répertoire, essayer de servir index.html
        const indexPath = path.join(normalizedFilePath, "index.html");
        if (fs.existsSync(indexPath)) {
          const content = fs.readFileSync(indexPath);
          res.writeHead(200, {
            "Content-Type": "text/html",
            "Cache-Control": "no-cache",
          });
          res.end(content);
        } else {
          res.writeHead(404);
          res.end("Directory listing not allowed");
        }
        return;
      }

      // Servir le fichier
      const mimeType = getMimeType(normalizedFilePath);
      const content = fs.readFileSync(normalizedFilePath);

      res.writeHead(200, {
        "Content-Type": mimeType,
        "Content-Length": content.length,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      });
      res.end(content);
    } catch (error) {
      console.error("Server error:", error);
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  });

  // Garder une trace des connexions pour pouvoir les fermer proprement
  server.on("connection", (conn) => {
    connections.add(conn);
    conn.on("close", () => {
      connections.delete(conn);
    });
  });

  // Ajouter une méthode pour fermer toutes les connexions
  (server as any).closeAllConnections = () => {
    for (const conn of connections) {
      conn.destroy();
    }
    connections.clear();
  };

  return server;
}

function startServer(outputDir?: string, serverPort: number = 3737) {
  // Utiliser le répertoire fourni ou détecter automatiquement
  let reportDir: string | null = null;

  if (outputDir) {
    const specifiedDir = path.resolve(process.cwd(), outputDir);
    if (fs.existsSync(specifiedDir)) {
      reportDir = specifiedDir;
      console.log(`📁 Using specified directory: ${reportDir}`);
    } else {
      console.error(`❌ Specified directory does not exist: ${specifiedDir}`);
      process.exit(1);
    }
  } else {
    // Vérifier si un répertoire est spécifié en argument (pour CLI direct)
    const args = process.argv.slice(2);
    if (args.length > 0) {
      const specifiedDir = path.resolve(process.cwd(), args[0]);
      if (fs.existsSync(specifiedDir)) {
        reportDir = specifiedDir;
        console.log(`📁 Using specified directory: ${reportDir}`);
      } else {
        console.error(`❌ Specified directory does not exist: ${specifiedDir}`);
        process.exit(1);
      }
    } else {
      reportDir = findReportDirectory();
    }
  }

  if (!reportDir) {
    console.error("❌ Aucun rapport trouvé.");
    console.error("");
    console.error("Solutions possibles:");
    console.error("1. Générez un rapport avec Playwright:");
    console.error("   npx playwright test --reporter=./dist/index.js");
    console.error("");
    console.error("2. Ou spécifiez le répertoire du rapport:");
    console.error("   node src/server/serve-report.ts /path/to/report");
    console.error("");
    console.error(
      "3. Assurez-vous que outputDir dans votre playwright.config.ts pointe vers un répertoire existant"
    );
    process.exit(1);
  }

  console.log(`📁 Serving report from: ${reportDir}`);

  const server = createServer(reportDir);
  const port = serverPort;

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`🚀 Report server started at ${url}`);
    console.log(`📊 Open your report: ${url}`);
    console.log(`🔍 Trace viewer: ${url}/trace/`);
    console.log("");
    console.log("Press Ctrl+C to stop the server");

    // Essayer d'ouvrir le navigateur automatiquement
    const { exec } = require("child_process");
    const platform = process.platform;

    let cmd = "";
    if (platform === "darwin") cmd = `open "${url}"`;
    else if (platform === "win32") cmd = `start "${url}"`;
    else cmd = `xdg-open "${url}"`;

    exec(cmd, (error: any) => {
      if (error) {
        console.log(
          "Note: Could not auto-open browser. Please open manually:",
          url
        );
      }
    });
  });

  // Gestion propre de l'arrêt
  let isShuttingDown = false;

  const handleShutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log("\n👋 Stopping server...");

    // Fermer toutes les connexions actives
    (server as any).closeAllConnections?.();

    server.close(() => {
      console.log("✅ Server stopped");
      process.exit(0);
    });

    // Force exit après 3 secondes si le serveur ne se ferme pas proprement
    setTimeout(() => {
      console.log("⚠️  Force stopping server...");
      process.exit(1);
    }, 3000);
  };

  // Retirer tous les listeners SIGINT existants et en ajouter un seul
  process.removeAllListeners("SIGINT");
  process.on("SIGINT", handleShutdown);
}

// Export pour utilisation en tant que module
export async function serveReport(
  outputDir?: string,
  port: number = 3737
): Promise<void> {
  return startServer(outputDir, port);
}

// Démarrer le serveur si exécuté directement
if (require.main === module) {
  startServer();
}
