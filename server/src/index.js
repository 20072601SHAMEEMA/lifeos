import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { SERVER_ROOT } from './db.js';
import { HttpError } from './utils/validate.js';
import { seedDemo, DEMO_EMAIL } from './seed.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import contactRoutes from './routes/contacts.js';
import journeyRoutes from './routes/journeys.js';
import sosRoutes from './routes/sos.js';
import historyRoutes from './routes/history.js';
import cardRoutes from './routes/card.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = Number(process.env.PORT) || 5050;

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'lifeos-api', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/journeys', journeyRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/safety-history', historyRoutes);
app.use('/api/card', cardRoutes);
app.use('/api/settings', settingsRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: `No API route for ${req.method} ${req.originalUrl}` }));

// In production (`npm run build` then `npm start`) the API also serves the React app.
const clientDist = path.resolve(SERVER_ROOT, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, fields: err.details });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'That upload is too large.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

if (process.env.SEED_DEMO !== 'false' && seedDemo()) {
  console.log(`Seeded demo account: ${DEMO_EMAIL}`);
}

app.listen(PORT, () => {
  console.log(`LifeOS API running on http://localhost:${PORT}`);
});
