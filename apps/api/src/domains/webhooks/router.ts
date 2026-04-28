import { Router } from 'express';
import { verifyGitHubSignature } from '../../core/middleware/verifyGithub';
import { anomalyDetector, feedEmitter } from '../../services/securityFeeds';
import ActivityLog from '../../../models/ActivityLog';
import UserConnection from '../../../models/UserConnection';

const router = Router();

/**
 * Handle incoming GitHub Webhooks.
 * Validates signatures and broadcasts events to multi-tenant feed.
 */
router.post('/github', verifyGitHubSignature, async (req, res) => {
  const eventType = req.headers['x-github-event'] as string;
  const payload = req.body;
  const installationId = payload.installation?.id?.toString();

  if (!installationId) {
    return res.status(200).send('Event ignored: No installation ID');
  }

  // 1. Handle Life-cycle events
  if (eventType === 'installation') {
    if (payload.action === 'deleted') {
        console.log(`[Webhooks] Revoking access for installation: ${installationId}`);
        await UserConnection.updateMany({ installationId }, { $unset: { installationId: 1 }, status: 'pending' });
    }
    return res.json({ success: true });
  }

  // 2. Handle Push events (The Core Feed)
  if (eventType === 'push') {
    const analysis = anomalyDetector.analyzeEvent(payload);
    
    // Save to DB for historical view
    const log = await ActivityLog.create({
      installationId,
      module: 'git',
      event: analysis.message,
      severity: analysis.severity,
      metadata: {
        repo: payload.repository?.full_name,
        pusher: payload.pusher?.name,
        ref: payload.ref
      }
    });

    // Broadcast to live SSE streams
    feedEmitter.emit('new_event', {
      installationId,
      log: {
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        module: 'git',
        event: analysis.message,
        style: analysis.severity === 'normal' ? 'normal' : analysis.severity === 'anomaly' ? 'anomaly' : 'critical'
      }
    });
  }

  res.json({ success: true });
});

export default router;
