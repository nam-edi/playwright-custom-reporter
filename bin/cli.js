#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Import du serveur
const { serveReport } = require(path.join(__dirname, '../dist/server/serve-report'));

const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
@naamedi/playwright-reporter CLI

Usage:
  npx pw-serve [reportDir]              # Short command (recommended)
  npx @naamedi/playwright-reporter serve [reportDir]  # Full command

Commands:
  serve [reportDir]    Serve a report directory (default: auto-detect)

Options:
  --help, -h          Show this help message
  --port, -p [port]   Port number (default: 3737)

Examples:
  npx pw-serve                         # Auto-detect report directory
  npx pw-serve ./custom-report         # Specific directory
  npx pw-serve -p 4000                 # Custom port
  
  # Or use the full command:
  npx @naamedi/playwright-reporter serve
  `);
}

function findReportDir() {
  // Auto-detect report directory
  const possibleDirs = [
    './report',
    './custom-report',
    './test-results/custom-report',
    './playwright-report',
    './test-results'
  ];

  for (const dir of possibleDirs) {
    if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html'))) {
      return dir;
    }
  }

  return null;
}

async function serve() {
  let reportDir = args[1];
  let port = 3737;

  // Parse arguments
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--port' || args[i] === '-p') {
      port = parseInt(args[i + 1]) || 3737;
      i++; // Skip next argument
    } else if (args[i] === '--help' || args[i] === '-h') {
      showHelp();
      return;
    } else if (!reportDir && !args[i].startsWith('-')) {
      reportDir = args[i];
    }
  }

  // Auto-detect if no directory specified
  if (!reportDir) {
    reportDir = findReportDir();
    if (!reportDir) {
      console.error('❌ No report directory found. Please specify a path or generate a report first.');
      console.log('📖 Usage: npx @naamedi/playwright-reporter serve [reportDir]');
      process.exit(1);
    }
    console.log(`🔍 Auto-detected report directory: ${reportDir}`);
  }

  // Check if directory exists
  if (!fs.existsSync(reportDir)) {
    console.error(`❌ Report directory not found: ${reportDir}`);
    process.exit(1);
  }

  // Check if index.html exists
  if (!fs.existsSync(path.join(reportDir, 'index.html'))) {
    console.error(`❌ No index.html found in: ${reportDir}`);
    console.log('Make sure this is a valid Playwright report directory.');
    process.exit(1);
  }

  try {
    console.log(`🚀 Starting server for report: ${reportDir}`);
    await serveReport(reportDir, port);
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Main logic
if (!command || command === '--help' || command === '-h') {
  showHelp();
} else if (command === 'serve') {
  serve().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
} else {
  console.error(`❌ Unknown command: ${command}`);
  showHelp();
  process.exit(1);
}