import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';

import { isAppError } from '@servx/errors';

import authRouter from './domains/auth/router';
import githubRouter from './domains/github/router';
import databasesRouter from './domains/databases/router';
import connectionsRouter from './domains/connections/router';
import hostingRouter from './domains/hosting/router';
import gmailRouter from './domains/gmail/router';
import operationsRouter from './domains/operations/router';
import adminRouter from './domains/admin/router';

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        const allowedOrigins = [
          process.env.FRONTEND_URL,
          'http://localhost:8080',
          'http://localhost:8083',
          'http://localhost:5173',
        ].filter(Boolean) as string[];

        if (!origin) {
          callback(null, true);
          return;
        }

        if (!allowedOrigins.includes(origin) && process.env.NODE_ENV === 'production') {
          callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'));
          return;
        }

        callback(null, true);
      },
      credentials: true,
    })
  );

  app.use(express.json());

  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  app.get('/', (_req, res) => {
    res.send('API is running...');
  });

  registerApiRoutes(app);
  registerErrorHandler(app);

  return app;
}

export function registerApiRoutes(app: Express): void {
  app.use('/api/auth', authRouter);
  app.use('/api/github', githubRouter);
  app.use('/api/db', databasesRouter);
  app.use('/api/connections', connectionsRouter);
  app.use('/api/oauth', hostingRouter);
  app.use('/api', gmailRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/operations', operationsRouter);
  app.use('/api/tasks', operationsRouter);
}

export function registerErrorHandler(app: Express): void {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (isAppError(err)) {
      res.status(err.statusCode).json({ code: err.code, message: err.message });
      return;
    }
    console.error('[unhandled error]', err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
  });
}
