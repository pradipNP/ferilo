import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { pool, testConnection } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '5000', 10),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
};

const logger = pino({
  level: env.isProduction ? 'info' : 'debug',
  transport: env.isProduction
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } },
});

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

app.get('/api/health', async (_req, res) => {
  let dbStatus = 'unknown';
  try {
    await testConnection();
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'ferilo-api',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    },
  });
});

app.listen(env.port, () => {
  logger.info(`FERILO API running on http://localhost:${env.port}`);
});

export { app, pool, logger, env };
