import { config } from 'dotenv';
config();
import express from 'express';
import cookieParser from 'cookie-parser';
import { errorMiddleware } from './shared/middlewares/error.middleware';
import { authRouter } from './auth';
import { adminRouter } from './admin.router';
import { usersRouter } from './users';
import { urlRouter } from './urls/url.router';
import { urlController } from './urls/url.module';
import cors from 'cors';

const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Basic health check route
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API v1 — auth module
app.use('/api/v1/auth', authRouter);

// API v1 — users module
app.use('/api/v1/users', usersRouter);

// API v1 — admin module
app.use('/api/v1/admin', adminRouter);

// API v1 — urls module
app.use('/api/v1/url', urlRouter);

// Reserved keywords for system routes that should not trigger redirects
const reservedKeywords = new Set(['admin', 'api', 'health', 'favicon.ico', 'robots.txt']);

// Root short URL redirection route
app.get('/:shortCode', (req, res, next) => {
  const { shortCode } = req.params;
  if (reservedKeywords.has(shortCode)) {
    return next();
  }
  urlController.redirectToOriginalUrl(req, res, next);
});

app.use(errorMiddleware); // must be registered last


export default app;
