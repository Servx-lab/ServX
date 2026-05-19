import type { Response, Request, NextFunction } from 'express';
import { ValidationError, NotFoundError } from '@servx/errors';
import { supabaseAdmin } from '../../utils/supabaseAdmin';

// In-memory store for active SSE connections for the Dashboard UI
// Keyed by PIN
const activeDashboardStreams: Record<string, Response[]> = {};

// Helper to broadcast status changes to all connected dashboard SSE clients
const broadcastStatusChange = (pin: string, status: string) => {
  const clients = activeDashboardStreams[pin];
  if (clients) {
    clients.forEach(res => {
      res.write(`data: ${JSON.stringify({ status })}\n\n`);
    });
  }
};

/**
 * Test 1: Ping
 * Validates the PIN exists and updates status from PENDING to TEST_1_PASSED.
 */
export async function verifyPing(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { pin } = req.body;
    if (!pin) throw new ValidationError('Missing pin parameter.');

    // Validate the PIN exists and is in a valid state
    const { data: repo, error } = await supabaseAdmin
      .from('servx_repositories')
      .select('verification_status')
      .eq('servx_pin', pin)
      .single();

    if (error || !repo) throw new NotFoundError('Invalid PIN or repository not found.');

    if (repo.verification_status === 'PENDING') {
      const { error: updateError } = await supabaseAdmin
        .from('servx_repositories')
        .update({ verification_status: 'TEST_1_PASSED' })
        .eq('servx_pin', pin);

      if (updateError) throw new Error('Database update failed.');
      broadcastStatusChange(pin, 'TEST_1_PASSED');
    }

    res.json({ success: true, message: 'Ping successful. Database updated.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Test 2: Environment Sync
 * Validates framework metadata and updates status to TEST_2_PASSED.
 */
export async function verifyEnv(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { pin, frameworkData } = req.body;
    if (!pin || !frameworkData) throw new ValidationError('Missing pin or frameworkData parameter.');

    const { data: repo, error } = await supabaseAdmin
      .from('servx_repositories')
      .select('verification_status')
      .eq('servx_pin', pin)
      .single();

    if (error || !repo) throw new NotFoundError('Invalid PIN or repository not found.');

    if (repo.verification_status === 'TEST_1_PASSED') {
      const { error: updateError } = await supabaseAdmin
        .from('servx_repositories')
        .update({ 
          verification_status: 'TEST_2_PASSED',
          framework_meta: frameworkData
        })
        .eq('servx_pin', pin);

      if (updateError) throw new Error('Database update failed.');
      broadcastStatusChange(pin, 'TEST_2_PASSED');
    }

    res.json({ success: true, message: 'Environment data synchronized.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Test 3: Persistent SSE Test
 * Opens a persistent stream with the CLI. Keeps it alive for 3 seconds to test firewalls,
 * then updates DB to VERIFIED and closes.
 */
export async function verifySseTest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pin = req.query.pin as string;
    if (!pin) throw new ValidationError('Missing pin query parameter.');

    const { data: repo, error } = await supabaseAdmin
      .from('servx_repositories')
      .select('verification_status')
      .eq('servx_pin', pin)
      .single();

    if (error || !repo) throw new NotFoundError('Invalid PIN.');

    // Initialize SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial connection heartbeat
    res.write(`data: ${JSON.stringify({ message: 'Connected to CLI SSE test...' })}\n\n`);

    // Simulate 3 seconds of persistence checking (bypassing basic proxy buffers)
    setTimeout(async () => {
      try {
        if (repo.verification_status === 'TEST_2_PASSED') {
          await supabaseAdmin
            .from('servx_repositories')
            .update({ verification_status: 'VERIFIED' })
            .eq('servx_pin', pin);
            
          broadcastStatusChange(pin, 'VERIFIED');
        }
        res.write(`data: ${JSON.stringify({ status: 'VERIFIED' })}\n\n`);
        res.end();
      } catch (e) {
        res.end();
      }
    }, 3000);

    // Handle client disconnect mid-test
    req.on('close', () => {
      res.end();
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Dashboard Live Status Polling/SSE Endpoint
 * Subscribes the operations dashboard to live state updates of a given PIN.
 */
export async function getVerifyStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pin = req.params.pin as string;
    if (!pin) throw new ValidationError('Missing PIN parameter.');

    // Check DB for the current status to immediately push
    const { data: repo, error } = await supabaseAdmin
      .from('servx_repositories')
      .select('verification_status')
      .eq('servx_pin', pin)
      .single();

    if (error || !repo) throw new NotFoundError('Repository PIN not found.');

    // Initialize SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send the current status immediately upon connection
    res.write(`data: ${JSON.stringify({ status: repo.verification_status })}\n\n`);

    // Add to active streams for broadcasting subsequent updates
    if (!activeDashboardStreams[pin]) {
      activeDashboardStreams[pin] = [];
    }
    activeDashboardStreams[pin].push(res);

    // Cleanup on disconnect
    req.on('close', () => {
      const index = activeDashboardStreams[pin].indexOf(res);
      if (index !== -1) {
        activeDashboardStreams[pin].splice(index, 1);
      }
      if (activeDashboardStreams[pin].length === 0) {
        delete activeDashboardStreams[pin];
      }
    });

  } catch (err) {
    next(err);
  }
}
