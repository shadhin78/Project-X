const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

// Helper to parse .env file
function parseEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim();
        env[key] = val;
      }
    });
  }
  return env;
}

const env = parseEnv();

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];

  // Route /api/config to environmental response
  if (url === '/api/config') {
    const currentEnv = parseEnv();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      supabaseUrl: currentEnv.SUPABASE_URL || currentEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      supabasePublishableKey: currentEnv.SUPABASE_PUBLISHABLE_KEY || currentEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || currentEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    }));
    return;
  }

  // Handle clean URLs (e.g. /login -> login.html)
  if (url === '/login') {
    url = '/login.html';
  }

  // Default to index.html
  if (url === '/') {
    url = '/index.html';
  }

  const filePath = path.join(ROOT_DIR, url);

  // Prevent directory traversal
  const relativePath = path.relative(ROOT_DIR, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n  ┌─────────────────────────────────────────────────────┐`);
  console.log(`  │  Project X Dev Server running at:                  │`);
  console.log(`  │  → http://localhost:${PORT}                          │`);
  console.log(`  │                                                     │`);
  console.log(`  │  ⚠  Use ONLY this URL for local development.       │`);
  console.log(`  │     Other ports (5000, 5500, etc.) lack /api/config │`);
  console.log(`  │     and will cause Supabase config resolution       │`);
  console.log(`  │     to fall back to .env or cached values.          │`);
  console.log(`  └─────────────────────────────────────────────────────┘\n`);
});
