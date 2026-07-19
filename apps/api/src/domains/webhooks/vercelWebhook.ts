import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
import { auditEmitter } from '../operations/auditEmitter';
import { syncDeploymentIncidents } from '../connections/service';

/**
 * Verifies the Vercel webhook signature.
 */
function verifyVercelSignature(req: Request, secret: string): boolean {
  const signature = req.headers['x-vercel-signature'] as string;
  if (!signature) return false;
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(JSON.stringify(req.body));
  const expected = hmac.digest('hex');
  return signature === expected;
}

/**
 * POST /api/webhooks/vercel/deploy
 * Receives Vercel deployment status change notifications.
 */
export async function handleVercelDeployWebhook(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const payload = req.body;
    const eventType = payload?.type;

    console.log(`[Webhook:Vercel] Received event: ${eventType}`);

    // Only process deployment failure events
    if (!eventType || !['deployment.error', 'deployment.failed'].includes(eventType)) {
      res.status(200).json({ received: true, skipped: true });
      return;
    }

    const deploymentData = payload?.payload?.deployment;
    const projectData = payload?.payload?.project;

    if (!deploymentData) {
      res.status(200).json({ received: true, skipped: true, reason: 'no_deployment_data' });
      return;
    }

    const deployId = deploymentData.id;
    const projectName = projectData?.name || deploymentData.name || 'Unknown Project';
    const deployUrl = deploymentData.url || null;

    // Look up which connection owns this deployment
    const { data: connections } = await supabaseAdmin
      .from('hosting_vault')
      .select('id, user_id, encrypted_config, iv')
      .eq('provider', 'Vercel');

    if (!connections || connections.length === 0) {
      console.warn('[Webhook:Vercel] No Vercel connections found in vault');
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
        if (webhookSecret && verifyVercelSignature(req, webhookSecret)) {
          matchedConnection = conn;
          break;
        }
      } catch (err) {
        console.warn(`[Webhook:Vercel] Error decrypting config for conn ${conn.id}`);
      }
    }

    if (!matchedConnection) {
      console.warn('[Webhook:Vercel] Could not verify webhook signature, processing anyway');
      matchedConnection = connections[0];
    }

    // Build the deployment failure record
    const failedDeployment = {
      id: deployId,
      name: projectName,
      state: 'ERROR',
      created: payload.createdAt || Date.now(),
      commit: null,
    };

    // Sync to incidents table
    await syncDeploymentIncidents(
      matchedConnection.user_id,
      matchedConnection.id,
      'vercel',
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
      `🚨 Vercel deployment failed: ${projectName} (${deployId.substring(0, 8)})`
    );

    console.log(`[Webhook:Vercel] Processed deploy failure for ${projectName} (connection: ${matchedConnection.id})`);
    res.status(200).json({ received: true, processed: true });
  } catch (err: any) {
    console.error('[Webhook:Vercel] Error processing webhook:', err.message);
    res.status(200).json({ received: true, error: err.message });
  }
}
