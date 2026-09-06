// ============================================================
// NEXUS RESQ — BACKEND API SERVER
// Express + TypeScript + PostgreSQL REST Server
// ============================================================
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import { testConnection } from './db';
import { authRouter } from './routes/auth';
import { incidentsRouter } from './routes/incidents';
import { emergencyRouter } from './routes/emergency';
import { sheltersRouter } from './routes/shelters';
import { routesRouter } from './routes/routes';
import { alertsRouter } from './routes/alerts';
import { respondersRouter } from './routes/responders';
import { resourcesRouter } from './routes/resources';
import { commandRouter } from './routes/command';
import { predictiveRouter } from './routes/predictive';
import { realtimeRouter } from './routes/realtime';
import { weatherRouter, locationRouter } from './routes/external';
import { approvalsRouter } from './routes/approvals';
import { notificationsRouter } from './routes/notifications';
import { orchestratorRouter } from './routes/orchestrator';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '8000', 10);

// ── Middlewares ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/health') {
      console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// ── Health Check ─────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'ok',
    service: 'nexus-resq-backend',
    database: dbStatus.connected ? 'connected' : 'disconnected',
    databaseError: dbStatus.error,
    timestamp: new Date().toISOString(),
  });
});

// ── Mount Routers ────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/emergency', emergencyRouter);
app.use('/api/shelters', sheltersRouter);
app.use('/api/evacuation-routes', routesRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/responders', respondersRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/command/predictive', predictiveRouter);
app.use('/api/command', commandRouter);
app.use('/api/events', realtimeRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/location', locationRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/orchestrator', orchestratorRouter);

// ── 404 & Error Handlers ─────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found.` });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error Unhandled]:', err);
  res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n============================================================`);
  console.log(`  NEXUS RESQ BACKEND SERVER STARTED`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/health`);
  console.log(`============================================================\n`);

  await testConnection();
});

export default app;
