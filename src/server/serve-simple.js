#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function findReportDirectory() {
  const currentDir = process.cwd();
  const exampleDir = path.join(currentDir, 'example', 'custom-report');
  
  if (fs.existsSync(exampleDir)) {
    return exampleDir;
  }

  const customReportPath = path.join(currentDir, 'custom-report');
  if (fs.existsSync(customReportPath)) {
    return customReportPath;
  }

  return null;
}

function serveReport() {
  const reportDir = findReportDirectory();
  
  if (!reportDir) {
    console.error('❌ Aucun rapport trouvé. Génèrez d\'abord un rapport avec:');
    console.error('   npm run test:example');
    process.exit(1);
  }

  console.log(`📁 Serving report from: ${reportDir}`);
  console.log('🚀 Starting report server...');
  console.log('');

  // Utiliser npx serve pour servir le répertoire
  const serve = spawn('npx', ['serve', '-s', reportDir, '-p', '8080'], {
    stdio: 'inherit',
    shell: true
  });

  serve.on('error', (error) => {
    console.error('Failed to start server:', error);
    console.log('');
    console.log('💡 Trying alternative method...');
    
    // Fallback: utiliser python si disponible
    const python = spawn('python3', ['-m', 'http.server', '8080'], {
      cwd: reportDir,
      stdio: 'inherit'
    });

    python.on('error', () => {
      console.error('❌ Could not start server.');
    });
  });

  // Gestion de l'arrêt propre
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping server...');
    serve.kill();
    process.exit(0);
  });
}

serveReport();