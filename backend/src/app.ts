import { config } from 'dotenv';
config();
import express from 'express';
import cookieParser from 'cookie-parser';
import { errorMiddleware } from './shared/middlewares/error.middleware';
import { authRouter } from './auth';
import { adminRouter } from './admin.router';

const app = express();
app.use(express.json());
app.use(cookieParser());

// Basic health check route
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API v1 — auth module
app.use('/api/v1/auth', authRouter);

// API v1 — admin module
app.use('/api/v1/admin', adminRouter);

app.use(errorMiddleware); // must be registered last


export default app;
