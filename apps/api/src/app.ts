import path from 'path';
import fs from 'fs';
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
import securityRouter from './domains/security/router';
import webhooksRouter from './domains/webhooks/router';
import feedRouter from './domains/feed/router';
import repositoriesRouter from './domains/repositories/router';
import verifyRouter from './domains/verify/router';
import devicesRouter from './domains/devices/router';
import { defconMiddleware } from './domains/operations/defconMiddleware';

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        // Parse FRONTEND_URL as a comma-separated list
        const envOrigins = process.env.FRONTEND_URL 
          ? process.env.FRONTEND_URL.split(',').map(o => o.trim()) 
          : [];

        const allowedOrigins = [
          ...envOrigins,
          'https://servx.vercel.app',
          'http://localhost:8080',
          'http://localhost:8083',
          'http://localhost:5173',
        ].filter(Boolean);

        if (!origin) {
          callback(null, true);
          return;
        }

        // Check if origin is explicitly allowed or matches a Vercel preview domain
        const isAllowed = allowedOrigins.includes(origin) || 
                         (origin.endsWith('.vercel.app') && process.env.NODE_ENV !== 'production');

        if (!isAllowed && process.env.NODE_ENV === 'production') {
          console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
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

  registerApiRoutes(app);
  
  const isProduction = process.env.NODE_ENV?.toLowerCase().trim() === 'production';
  const serveFrontend = isProduction || process.env.SERVE_FRONTEND === 'true';

  if (serveFrontend) {
    const distPath = path.resolve(__dirname, '../../web/dist');
    
    console.log(`[Frontend] Initializing static file server...`);
    console.log(`[Frontend] Target directory: ${distPath}`);

    if (fs.existsSync(distPath)) {
      console.log(`[Frontend] Found 'web/dist' directory. Serving static files.`);
      app.use(express.static(distPath));
      
      // Catch-all route for SPA (React Router)
      // We use a regex that matches anything NOT starting with /api
      app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn(`[Frontend] WARNING: 'web/dist' directory NOT FOUND at ${distPath}`);
      console.warn(`[Frontend] Fallback: Root route will return API status.`);
      app.get('/', (_req, res) => {
        res.send('API is running (Frontend build missing)...');
      });
    }
  } else {
    // Development mode fallback
    app.get('/', (_req, res) => {
      res.send('API is running (Development Mode)...');
    });
  }

  registerErrorHandler(app);

  return app;
}

export function registerApiRoutes(app: Express): void {
  app.use('/api', defconMiddleware);
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
  app.use('/api/security', securityRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/feed', feedRouter);
  app.use('/api/repositories', repositoriesRouter);
  app.use('/api/verify', verifyRouter);
  app.use('/api/devices', devicesRouter);
}


export function registerErrorHandler(app: Express): void {
  app.use(errorHandler);
}
