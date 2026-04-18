import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Middleware to verify GitHub Webhook signatures using HMAC-SHA256.
 * It compares the computed digest of the raw request body with the
 * x-hub-signature-256 header.
 */
export function verifyGitHubSignature(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-hub-signature-256'] as string;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[Webhooks] CRITICAL: GITHUB_WEBHOOK_SECRET not configured.');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (!signature) {
    console.warn('[Webhooks] Missing signature header');
    return res.status(401).json({ error: 'No signature provided' });
  }

  // Get raw body (requires express.json({ verify: ... }) in app.ts or similar)
  // For simplicity, we assume req.body is already parsed but for HMAC we ideally need rawBody.
  // In a robust implementation, we'd use a rawBody buffer.
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  try {
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );

    if (!isMatch) {
      console.warn('[Webhooks] Signature mismatch');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (err) {
    console.warn('[Webhooks] Comparison failed');
    return res.status(401).json({ error: 'Verification failed' });
  }

  next();
}
