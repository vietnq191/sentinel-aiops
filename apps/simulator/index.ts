import express, { type Request, type Response } from 'express';
import axios from 'axios';
import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';
import winston from 'winston';
import {
  RADIX_BASE_10,
  TIMESTAMP_NANO_MULTIPLIER,
  SECONDS_TO_MS_CONVERSION,
  MAX_LATENCY_RANDOM_MS,
  BASE_LATENCY_MS,
  HTTP_STATUS_UNAUTHORIZED,
  HTTP_STATUS_TOO_MANY_REQUESTS,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
} from './constants/simulator.constants.js';

const app = express();
const portStr = process.env.PORT;
if (!portStr) {
  throw new Error('FATAL: PORT environment variable is not defined or is empty!');
}
const port = parseInt(portStr, RADIX_BASE_10);

const lokiPushUrl = (process.env.LOKI_PUSH_URL || '').trim();
if (!lokiPushUrl) {
  throw new Error('FATAL: LOKI_PUSH_URL environment variable is not defined or is empty!');
}

/* Prometheus Metrics Setup */
const register = new Registry();
collectDefaultMetrics({ register });

const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1.0, 3.0, 5.0],
  registers: [register],
});

/* Custom Loki Pusher */
async function pushToLoki(level: string, message: string, metadata: any = {}) {
  const now = Date.now() * TIMESTAMP_NANO_MULTIPLIER;
  const logEntry = {
    streams: [{
      stream: { app: 'sentinel-simulator', level },
      values: [[now.toString(), JSON.stringify({ message, ...metadata })]]
    }]
  };

  try {
    await axios.post(lokiPushUrl, logEntry);
  } catch (error: any) {
    console.error('Failed to push to Loki:', error.message);
  }
}

/* Winston Logger Setup (Console only, we push to Loki manually) */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

/* Middleware for Metrics */
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / SECONDS_TO_MS_CONVERSION;
    httpRequestCounter.inc({ method: req.method, route: req.path, status_code: res.statusCode });
    httpRequestDuration.observe({ method: req.method, route: req.path, status_code: res.statusCode }, duration);
  });
  next();
});

/* Routes */

app.get('/', (req, res) => {
  const msg = 'Normal request received';
  logger.info(msg);
  pushToLoki('info', msg);
  res.send('Sentinel Simulator is running!');
});

app.get('/error', (req, res) => {
  const errorMsg = 'Critical system failure: Database connection timed out';
  logger.error(errorMsg, { error_code: 'ERR_DB_001' });
  pushToLoki('error', errorMsg, { error_code: 'ERR_DB_001' });
  res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).send(errorMsg);
});

app.get('/auth-error', (req, res) => {
  const errorMsg = 'Authentication failed: JWT signature has expired';
  logger.error(errorMsg, { error_code: 'ERR_AUTH_401' });
  pushToLoki('error', errorMsg, { error_code: 'ERR_AUTH_401' });
  res.status(HTTP_STATUS_UNAUTHORIZED).send(errorMsg);
});

app.get('/oom-error', (req, res) => {
  const errorMsg = 'Fatal error: Javascript heap out of memory';
  logger.error(errorMsg, { error_code: 'ERR_SYS_OOM' });
  pushToLoki('error', errorMsg, { error_code: 'ERR_SYS_OOM' });
  res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).send(errorMsg);
});

app.get('/rate-limit', (req, res) => {
  const errorMsg = 'Downstream API failure: 429 Too Many Requests';
  logger.error(errorMsg, { error_code: 'ERR_NET_429' });
  pushToLoki('error', errorMsg, { error_code: 'ERR_NET_429' });
  res.status(HTTP_STATUS_TOO_MANY_REQUESTS).send(errorMsg);
});

app.get('/slow', async (req, res) => {
  const delay = Math.floor(Math.random() * MAX_LATENCY_RANDOM_MS) + BASE_LATENCY_MS;
  const msg = `Slow request detected. Latency: ${delay}ms`;
  logger.warn(msg);
  pushToLoki('warn', msg);
  await new Promise(resolve => setTimeout(resolve, delay));
  res.send(`Response delivered after ${delay}ms`);
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(port, () => {
  logger.info(`Simulator listening on port ${port}`);
  console.log(`Simulator listening on port ${port}`);
});
