import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { createApiRouter, notFoundHandler, errorHandler, multerErrorHandler } from './api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '5000', 10),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5180',
  isProduction: process.env.NODE_ENV === 'production',
};

export const logger = pino({
  level: env.isProduction ? 'info' : 'debug',
  transport: env.isProduction
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } },
});

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
  }),
);

// Legacy redirect
app.get('/api/health', (_req, res) => res.redirect(308, '/api/v1/health'));

app.use('/api/v1', createApiRouter());
app.use(multerErrorHandler);
app.use(notFoundHandler);
app.use((err, req, res, next) => errorHandler(err, req, res, next, { logger, isProduction: env.isProduction }));

app.listen(env.port, () => {
  logger.info(`FERILO API running on http://localhost:${env.port}`);
  logger.info(`API base: http://localhost:${env.port}/api/v1`);
});

export { app };
