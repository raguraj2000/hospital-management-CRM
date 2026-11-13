// Minimal static server for the viewer (no dependencies): node serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'viewer');
const port = Number(process.argv[2] || process.env.PORT || 8090);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
  '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css' };

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const file = join(root, path || 'index.html');
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const f = (await stat(file)).isDirectory() ? join(file, 'index.html') : file;
    res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => console.log(`viewer on http://localhost:${port}`));
