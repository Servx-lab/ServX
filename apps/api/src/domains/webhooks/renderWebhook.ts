import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
import { auditEmitter } from '../operations/auditEmitter';
import { syncDeploymentIncidents } from '../connections/service';

/**
 * Verifies the Render webhook signature.
 */
function verifyRenderSignature(req: Request, secret: string): boolean {
  const signature = req.headers['webhook-signature'] as string;
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(req.body));
  const expected = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * POST /api/webhooks/render/deploy
 * Receives Render deployment status change notifications.
 */
export async function handleRenderDeployWebhook(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const payload = req.body;
    const eventType = payload?.type;
    
    console.log(`[Webhook:Render] Received event: ${eventType}`);

    // Only process deploy_ended or deploy_failed events
    if (!['deploy_ended', 'deploy_failed'].includes(eventType)) {
      res.status(200).json({ received: true, skipped: true });
      return;
    }

    const deployData = payload?.data;
    if (!deployData) {
      res.status(200).json({ received: true, skipped: true, reason: 'no data' });
      return;
    }

    // For deploy_ended, only process if status is 'failed'
    if (eventType === 'deploy_ended' && deployData.status !== 'failed') {
      res.status(200).json({ received: true, skipped: true, reason: 'not_failed' });
      return;
    }

    const serviceId = deployData.service?.id || deployData.serviceId;
    const deployId = deployData.id;
    const serviceName = deployData.service?.name || 'Unknown Service';

    if (!serviceId || !deployId) {
      console.warn('[Webhook:Render] Missing service or deploy ID in payload');
      res.status(200).json({ received: true, error: 'missing_ids' });
      return;
    }

    // Look up which connection owns this service by checking hosting_vault
    const { data: connections } = await supabaseAdmin
      .from('hosting_vault')
      .select('id, user_id, encrypted_config, iv')
      .eq('provider', 'Render');

    if (!connections || connections.length === 0) {
      console.warn('[Webhook:Render] No Render connections found in vault');
      res.status(200).json({ received: true, error: 'no_connections' });
      return;
    }

    // Verify signature against each connection's webhook secret
    let matchedConnection: { id: string; user_id: string } | null = null;
    for (const conn of connections) {
      try {
        const { decrypt } = require('@servx/crypto');
        let rawConfig = conn.encrypted_config;
        if (conn.iv) {
          rawConfig = decrypt({ iv: conn.iv, content: conn.encrypted_config });
        }
        const parsedConfig = JSON.parse(rawConfig);
        const webhookSecret = parsedConfig.webhookSecret;
        if (webhookSecret && verifyRenderSignature(req, webhookSecret)) {
          matchedConnection = conn;
          break;
        }
      } catch (err) {
        console.warn(`[Webhook:Render] Error decrypting config for conn ${conn.id}`);
      }
    }

    if (!matchedConnection) {
      console.warn('[Webhook:Render] Could not verify webhook signature, processing anyway');
      matchedConnection = connections[0];
    }

    // Build the deployment failure record
    const failedDeployment = {
      id: deployId,
      name: serviceName,
      state: 'ERROR',
      created: Date.now(),
      commit: deployData.commit?.message || null,
    };

    // Sync to incidents table
    await syncDeploymentIncidents(
      matchedConnection.user_id,
      matchedConnection.id,
      'render',
      [failedDeployment]
    );

    // Emit real-time SSE notification
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('email')
      .eq('id', matchedConnection.user_id)
      .single();

    const userEmail = profile?.email || 'system@servx.dev';
    auditEmitter.log(
      userEmail,
      'incident',
      `🚨 Render deployment failed: ${serviceName} (${deployId.substring(0, 8)})`
    );

    console.log(`[Webhook:Render] Processed deploy failure for ${serviceName} (connection: ${matchedConnection.id})`);
    res.status(200).json({ received: true, processed: true });
  } catch (err: any) {
    console.error('[Webhook:Render] Error processing webhook:', err.message);
    res.status(200).json({ received: true, error: err.message });
  }
}
