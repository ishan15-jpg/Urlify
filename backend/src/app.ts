import { config } from 'dotenv';
config();
import express from 'express';
import { errorMiddleware } from './shared/middlewares/error.middleware';


const app = express();
app.use(express.json());

// Basic health check route
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use(errorMiddleware); // must be registered last

export default app;
