import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './config/database.js';
import { handleAppointmentRoutes } from './routes/appointmentRoutes.js';
import { handleMedicationRoutes } from './routes/medicationRoutes.js';
import { handleSymptomRoutes } from './routes/symptomRoutes.js';
import { handleUserRoutes } from './routes/userRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

export function createMedBuddyServer({ dbPath = path.resolve(__dirname, '../data/medbuddy.db') } = {}) {
  const db = createDatabase(dbPath);

  async function readJsonBody(req) {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
      total += chunk.length;
      if (total > 1024 * 1024) throw new Error('PAYLOAD_TOO_LARGE');
      chunks.push(chunk);
    }
    if (chunks.length === 0) return {};
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      throw new Error('INVALID_JSON');
    }
  }

  function makeSendJson(res) {
    return (status, data) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
      });
      res.end(JSON.stringify(data));
      return true;
    };
  }

  function serveStatic(pathname, res) {
    const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.replace(/^\/+/, ''));
    const resolved = path.resolve(PUBLIC_DIR, rel);
    if (!resolved.startsWith(PUBLIC_DIR) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: 'Not found' }));
      return;
    }
    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
    });
    fs.createReadStream(resolved).pipe(res);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = url.pathname;
    const method = req.method || 'GET';
    const sendJson = makeSendJson(res);

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      return res.end();
    }

    try {
      if (method === 'GET' && pathname === '/api/health') {
        return sendJson(200, { success: true, service: 'MedBuddy' });
      }

      const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await readJsonBody(req) : {};
      const ctx = { method, pathname, url, body, db, sendJson };

      if (handleUserRoutes(ctx) !== false) return;
      if (handleAppointmentRoutes(ctx) !== false) return;
      if (handleMedicationRoutes(ctx) !== false) return;
      if (handleSymptomRoutes(ctx) !== false) return;

      return serveStatic(pathname, res);
    } catch (err) {
      if (err.message === 'INVALID_JSON') return sendJson(400, { success: false, error: 'Invalid JSON body.' });
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(413, { success: false, error: 'Payload too large.' });
      return sendJson(500, { success: false, error: 'Internal server error.' });
    }
  });

  return { server, db };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const port = Number(process.env.PORT || 3000);
  const { server } = createMedBuddyServer();
  server.listen(port, () => {
    console.log(`MedBuddy server running at http://localhost:${port}`);
  });
}
