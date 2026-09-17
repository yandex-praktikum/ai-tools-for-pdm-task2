import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const assetsRoot = resolve(projectRoot, '../assets');
const port = Number(process.env.PORT || 4173);
const vendorPath = resolve(projectRoot, 'node_modules/echarts/dist/echarts.min.js');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.sql': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (requestUrl.pathname === '/health.json') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ status: 'ok', snapshot: 'quickcart-evening-pilot-v1' }));
    return;
  }

  let filePath;
  if (requestUrl.pathname === '/vendor/echarts.min.js') {
    filePath = vendorPath;
  } else if (requestUrl.pathname.startsWith('/assets/')) {
    const relativeAssetPath = decodeURIComponent(requestUrl.pathname.slice('/assets/'.length));
    filePath = resolve(assetsRoot, relativeAssetPath);
    if (filePath !== assetsRoot && !filePath.startsWith(`${assetsRoot}${sep}`)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
  } else {
    const relativePath = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
    filePath = resolve(projectRoot, `.${relativePath}`);
    if (filePath !== projectRoot && !filePath.startsWith(`${projectRoot}${sep}`)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(filePath).pipe(response);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use.`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Local: http://localhost:${port}/`);
});
