import { Router } from 'express';
import requireAuth from '../../core/middleware/requireAuth';
import UserConnection from '../../../models/UserConnection';
import { feedEmitter } from '../../services/securityFeeds';

const router = Router();

/**
 * GET /api/feed/stream
 * Secure multi-tenant SSE stream for live anomalies.
 */
router.get('/stream', requireAuth, async (req: any, res: any) => {
  const ownerUid = req.user.uid;

  // 1. Fetch all installation IDs associated with this user
  const connections = await UserConnection.find({ ownerUid, provider: 'GitHub' });
  const myInstallationIds = connections
    .map(c => c.installationId)
    .filter(Boolean) as string[];

  // 2. Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // 3. Subscription handler
  const onNewEvent = (data: { installationId: string, log: any }) => {
    // SECURITY: Multi-tenant filtering
    if (myInstallationIds.includes(data.installationId)) {
        res.write(`data: ${JSON.stringify(data.log)}\n\n`);
    }
  };

  feedEmitter.on('new_event', onNewEvent);

  // 4. Cleanup on disconnect
  req.on('close', () => {
    feedEmitter.removeListener('new_event', onNewEvent);
    res.end();
  });

  // Keep-alive heartbeat
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => clearInterval(heartbeat));
});

export default router;
