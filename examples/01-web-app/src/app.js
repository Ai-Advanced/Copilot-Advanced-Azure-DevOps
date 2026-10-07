'use strict';

const express = require('express');
const { z } = require('zod');
const { version } = require('../package.json');

function createApp() {
  const app = express();
  const users = [
    { id: 1, name: 'Synthetic Alice', email: 'alice@example.invalid' },
    { id: 2, name: 'Synthetic Bob', email: 'bob@example.invalid' },
  ];
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    res.on('finish', () => console.log(JSON.stringify({
      event: 'http-response', status: res.statusCode, version,
    })));
    next();
  });
  app.use(express.json({ limit: '8kb' }));
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version, timestamp: new Date().toISOString() });
  });
  app.get('/users', (_req, res) => res.json(users));
  const userSchema = z.object({
    name: z.string().trim().min(1).max(80),
    email: z.string().email().max(160).endsWith('@example.invalid'),
  }).strict();
  app.post('/users', (req, res) => {
    const result = userSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.flatten() });
    }
    if (users.length >= 100) {
      return res.status(409).json({ error: 'Training record limit reached; restart to reset.' });
    }
    const user = { id: users.length + 1, ...result.data };
    users.push(user);
    return res.status(201).json(user);
  });
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large') {
      return res.status(error.status).json({ error: 'Invalid JSON request body' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

module.exports = { createApp };
