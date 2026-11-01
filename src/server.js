/**
 * VoteGuard AI — Express API Server
 * Serves the reconciliation engine over HTTP for the dashboard.
 */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { reconcileElection } = require('./reconciler');
const { SEED_POLLING_UNITS } = require('../data/seed_polling_units');

const PORT = process.env.PORT || 3000;

function jsonResponse(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data, null, 2));
}

function fileResponse(res, filePath, contentType) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/' || url === '/index.html') {
    return fileResponse(res, path.join(__dirname, '../dashboard.html'), 'text/html');
  }

  if (url === '/api/audit') {
    const report = reconcileElection(SEED_POLLING_UNITS);
    return jsonResponse(res, report);
  }

  if (url === '/api/health') {
    return jsonResponse(res, { status: 'ok', engine: 'VoteGuard AI v1.0', timestamp: new Date().toISOString() });
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`VoteGuard AI server running at http://localhost:${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/audit`);
});
