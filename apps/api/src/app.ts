import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';

import { isAppError } from '@servx/errors';
import errorHandler from './core/middleware/errorHandler';

import authRouter from './domains/auth/router';
import githubRouter from './domains/github/router';
import databasesRouter from './domains/databases/router';
import connectionsRouter from './domains/connections/router';
import hostingRouter from './domains/hosting/router';
import gmailRouter from './domains/gmail/router';
import operationsRouter from './domains/operations/router';
import adminRouter from './domains/admin/router';
import usersRouter from './domains/users/router';
import profileRouter from './domains/profile/router';

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
  app.use('/api/users', usersRouter);
  app.use('/api/operations', operationsRouter);
  app.use('/api/tasks', operationsRouter);
  app.use('/api/profile', profileRouter);
}

export function registerErrorHandler(app: Express): void {
  app.use(errorHandler);
}
