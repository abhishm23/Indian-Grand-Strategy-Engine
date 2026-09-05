/**
 * 14th-Century Indian Subcontinent Grand Strategy Game
 * Server: server.js
 * 
 * Production-grade HTTP & Game State Persistence Server.
 * Built with zero external npm dependencies using Node.js standard libraries.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const SAVES_DIR = path.join(__dirname, 'saves');

// Ensure saves directory exists
if (!fs.existsSync(SAVES_DIR)) {
  fs.mkdirSync(SAVES_DIR, { recursive: true });
}

// MIME Types Dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  // CORS & Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || HOST}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // =========================================================================
  // API ROUTING
  // =========================================================================

  // 1. Health check & Server info
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      game: '14th-Century Subcontinent Grand Strategy',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 2. List all saved games on disk
  if (pathname === '/api/saves' && req.method === 'GET') {
    try {
      const files = fs.readdirSync(SAVES_DIR).filter(f => f.endsWith('.json'));
      const saves = files.map(file => {
        const stats = fs.statSync(path.join(SAVES_DIR, file));
        return {
          filename: file,
          sizeBytes: stats.size,
          modified: stats.mtime.toISOString()
        };
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, saves }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 3. Save Game to Disk (POST /api/save)
  if (pathname === '/api/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const name = (data.name || `save_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${name}.json`;
        const filepath = path.join(SAVES_DIR, filename);

        fs.writeFileSync(filepath, typeof data.state === 'string' ? data.state : JSON.stringify(data.state, null, 2), 'utf-8');
        console.log(`[SAVE] Game state successfully persisted to ${filename}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, filename }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 4. Load Game from Disk (GET /api/save/:filename)
  if (pathname.startsWith('/api/save/') && req.method === 'GET') {
    const filename = path.basename(pathname.replace('/api/save/', ''));
    const filepath = path.join(SAVES_DIR, filename);

    if (!fs.existsSync(filepath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Save file not found' }));
      return;
    }

    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, state: JSON.parse(content) }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // =========================================================================
  // STATIC FILE SERVING
  // =========================================================================

  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = 'index.html';
  }

  const filePath = path.join(__dirname, safePath);

  // Prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

function launchGameWindow(port) {
  const url = `http://localhost:${port}`;
  console.log(`[LAUNCH] Dispatching standalone game window: ${url}`);

  // 1. Try Microsoft Edge in application mode (frameless app window)
  exec(`start msedge --app=${url}`, (edgeErr) => {
    if (!edgeErr) return;
    // 2. Try Google Chrome in application mode
    exec(`start chrome --app=${url}`, (chromeErr) => {
      if (!chromeErr) return;
      // 3. Fallback to default Windows browser
      exec(`start ${url}`, (defaultErr) => {
        if (defaultErr) {
          console.log(`[NOTICE] Please open your web browser and navigate to: ${url}`);
        }
      });
    });
  });
}

function startServer(initialPort = PORT, maxAttempts = 10) {
  let currentPort = Number(initialPort);

  const tryListen = () => {
    server.removeAllListeners('error');

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[INFO] Port ${currentPort} is currently occupied.`);

        // Check if existing service is our game
        const req = http.get(`http://localhost:${currentPort}/api/health`, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              const info = JSON.parse(data);
              if (info.game && info.game.includes('14th-Century')) {
                console.log(`\n======================================================================`);
                console.log(`⚔️  14th-CENTURY GRAND STRATEGY SERVER IS ALREADY RUNNING! ⚔️`);
                console.log(`📡 Reconnected to active server on port ${currentPort}`);
                console.log(`======================================================================\n`);
                launchGameWindow(currentPort);
                return;
              }
            } catch (_) {}

            // Not our game, try next port
            if (currentPort - Number(initialPort) < maxAttempts) {
              currentPort++;
              console.log(`[PORT] Trying next available port: ${currentPort}...`);
              tryListen();
            } else {
              console.error(`[ERROR] Could not find an open port between ${initialPort} and ${currentPort}.`);
              process.exit(1);
            }
          });
        });

        req.on('error', () => {
          if (currentPort - Number(initialPort) < maxAttempts) {
            currentPort++;
            console.log(`[PORT] Trying next available port: ${currentPort}...`);
            tryListen();
          } else {
            console.error(`[ERROR] Could not find an open port between ${initialPort} and ${currentPort}.`);
            process.exit(1);
          }
        });
      } else {
        console.error(`[SERVER ERROR]`, err);
        process.exit(1);
      }
    });

    server.listen(currentPort, () => {
      console.log(`\n======================================================================`);
      console.log(`⚔️  14th-CENTURY INDIAN SUBCONTINENT GRAND STRATEGY GAME SERVER ⚔️`);
      console.log(`======================================================================`);
      console.log(`📡 Server Address: http://localhost:${currentPort}`);
      console.log(`📁 Game Directory: ${__dirname}`);
      console.log(`💾 Saves Folder:   ${SAVES_DIR}`);
      console.log(`🎮 Game URL:       http://localhost:${currentPort}/`);
      console.log(`======================================================================`);
      console.log(`Ready! Press Ctrl+C in this console to shutdown server.\n`);

      launchGameWindow(currentPort);
    });
  };

  tryListen();
}

startServer();
