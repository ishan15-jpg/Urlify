import { config } from 'dotenv';
config();
import express from 'express';
import { errorMiddleware } from './shared/middlewares/error.middleware';
import { authRouter } from './auth';

const app = express();
app.use(express.json());

// Basic health check route
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API v1 — auth module
app.use('/api/v1/auth', authRouter);

app.use(errorMiddleware); // must be registered last

export default app;
