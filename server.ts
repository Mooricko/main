import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractUrlOnServer,
  type ServerThirdPartyProxy,
} from './src/server/urlExtractor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const distDir = path.resolve(__dirname, 'dist');
  const distIndexPath = path.join(distDir, 'index.html');

  const isDev =
    process.argv.includes('--dev') ||
    process.env.NODE_ENV === 'development' ||
    (process.env.NODE_ENV !== 'production' && !fs.existsSync(distIndexPath));

  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'khoroos-reader' });
  });

  // Direct backend URL extraction (GET always runs direct-only; POST supports explicit thirdPartyProxy opt-in)
  app.get('/api/extract-url', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    const result = await extractUrlOnServer({ url: rawUrl });

    if (result.ok) {
      res.status(result.status).json({
        success: true,
        html: result.html,
        markdown: result.markdown,
        url: result.url,
        contentType: result.contentType,
        source: result.source,
      });
      return;
    }

    res.status(result.status).json({
      success: false,
      code: result.code,
      error: result.error,
      targetUrl: result.url,
      statusCode: result.statusCode,
    });
  });

  app.post('/api/extract-url', async (req, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
      url?: unknown;
      thirdPartyProxy?: unknown;
    };
    const rawUrl = typeof body.url === 'string' ? body.url : '';
    const thirdPartyProxy: ServerThirdPartyProxy | undefined =
      body.thirdPartyProxy === 'jina' ? 'jina' : undefined;

    const result = await extractUrlOnServer({
      url: rawUrl,
      thirdPartyProxy,
    });

    if (result.ok) {
      res.status(result.status).json({
        success: true,
        html: result.html,
        markdown: result.markdown,
        url: result.url,
        contentType: result.contentType,
        source: result.source,
      });
      return;
    }

    res.status(result.status).json({
      success: false,
      code: result.code,
      error: result.error,
      targetUrl: result.url,
      statusCode: result.statusCode,
    });
  });

  // Unknown /api/* endpoints return JSON 404 rather than HTML SPA fallback
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, error: 'API route not found.' });
  });

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(distDir, {
        setHeaders(res, filePath) {
          if (filePath.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
          } else if (filePath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          }
        },
      })
    );

    app.get('*', (_req, res) => {
      res.sendFile(distIndexPath);
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(
      `Khoroos Reader server running on http://0.0.0.0:${port} (${isDev ? 'development' : 'production'})`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start Khoroos Reader server:', err);
  process.exit(1);
});
