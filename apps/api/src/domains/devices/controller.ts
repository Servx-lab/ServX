import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
import { getRedisClient } from '../../core/services/redisCache';
import { ValidationError, NotFoundError, AuthError } from '@servx/errors';

/**
 * SSE Endpoint: GET /api/devices/listen-requests
 * Used by approved Main Devices to listen for incoming login requests from new devices.
 */
export async function listenRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    next(new AuthError('Authenticated user context is required.'));
    return;
  }

  const redis = await getRedisClient();
  if (!redis) {
    res.status(500).json({ error: 'redis_error', message: 'Redis service is unavailable.' });
    return;
  }

  // Duplicate Redis client since standard client cannot issue publish/sets in subscribe mode
  const subClient = redis.duplicate();

  try {
    await subClient.connect();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for Nginx
    });

    res.write('data: {"status":"connected", "stream":"requests"}\n\n');

    // Subscription block
    await subClient.subscribe(`device_approvals:${userId}`, (message) => {
      res.write(`data: ${message}\n\n`);
    });

    // Keep-alive heartbeat interval to prevent gateway timeouts
    const heartbeatInterval = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    req.on('close', async () => {
      clearInterval(heartbeatInterval);
      try {
        await subClient.unsubscribe(`device_approvals:${userId}`);
        await subClient.disconnect();
      } catch (err: any) {
        console.error('[SSE] Error closing request listener Redis client:', err.message);
      }
      res.end();
    });

  } catch (err) {
    next(err);
  }
}

/**
 * SSE Endpoint: GET /api/devices/listen-approval/:fingerprint
 * Used by unapproved New Devices to listen for their specific approval resolution.
 */
export async function listenApproval(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.id;
  const { fingerprint } = req.params;

  if (!userId) {
    next(new AuthError('Authenticated user context is required.'));
    return;
  }
  if (!fingerprint) {
    next(new ValidationError('Device fingerprint parameter is required.'));
    return;
  }

  const redis = await getRedisClient();
  if (!redis) {
    res.status(500).json({ error: 'redis_error', message: 'Redis service is unavailable.' });
    return;
  }

  const subClient = redis.duplicate();

  try {
    await subClient.connect();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write('data: {"status":"connected", "stream":"approval"}\n\n');

    // Subscribe to user channel and filter messages inside the stream callback
    await subClient.subscribe(`device_approvals:${userId}`, (message) => {
      try {
        const data = JSON.parse(message);
        if (data.event === 'device_resolved' && data.device_fingerprint === fingerprint) {
          res.write(`data: ${message}\n\n`);
        }
      } catch (err: any) {
        console.error('[SSE] Error parsing pubsub message in approval listener:', err.message);
      }
    });

    const heartbeatInterval = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    req.on('close', async () => {
      clearInterval(heartbeatInterval);
      try {
        await subClient.unsubscribe(`device_approvals:${userId}`);
        await subClient.disconnect();
      } catch (err: any) {
        console.error('[SSE] Error closing approval listener Redis client:', err.message);
      }
      res.end();
    });

  } catch (err) {
    next(err);
  }
}

/**
 * Action Endpoint: POST /api/devices/approve
 * Invoked by the approved Main Device to approve or deny a pending device registration request.
 */
export async function approveDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.id;
  const { device_fingerprint, status, device_name } = req.body;

  if (!userId) {
    next(new AuthError('Authenticated user context is required.'));
    return;
  }
  if (!device_fingerprint || !status) {
    next(new ValidationError('Both device_fingerprint and status parameters are required.'));
    return;
  }
  if (status !== 'APPROVED' && status !== 'DENIED') {
    next(new ValidationError('Status must be either APPROVED or DENIED.'));
    return;
  }

  try {
    // 1. Verify that the device exists and is bound to the requesting user
    const { data: targetDevice, error: findError } = await supabaseAdmin
      .from('user_devices')
      .select('*')
      .eq('user_uuid', userId)
      .eq('device_fingerprint', device_fingerprint)
      .maybeSingle();

    if (findError) throw findError;
    if (!targetDevice) {
      next(new NotFoundError('The target device registration was not found.'));
      return;
    }

    // 2. Perform database update in Supabase
    const { data: updatedDevice, error: updateError } = await supabaseAdmin
      .from('user_devices')
      .update({
        status,
        ...(status === 'APPROVED' && device_name ? { device_name } : {})
      })
      .eq('user_uuid', userId)
      .eq('device_fingerprint', device_fingerprint)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3. Publish real-time event to Redis PubSub to alert the waiting device
    const redis = await getRedisClient();
    if (redis) {
      await redis.publish(
        `device_approvals:${userId}`,
        JSON.stringify({
          event: 'device_resolved',
          device_fingerprint,
          status,
          device_name: updatedDevice?.device_name || device_name || targetDevice.device_name
        })
      );
    }

    res.json({
      success: true,
      message: `Device successfully ${status.toLowerCase()}`,
      device: updatedDevice
    });

  } catch (err) {
    next(err);
  }
}

/**
 * Fetch all devices for the authenticated user.
 */
export async function listDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    next(new AuthError('Authenticated user context is required.'));
    return;
  }
  try {
    const { data: devices, error } = await supabaseAdmin
      .from('user_devices')
      .select('*')
      .eq('user_uuid', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(devices);
  } catch (err) {
    next(err);
  }
}

/**
 * Revoke (delete) a device registration.
 */
export async function revokeDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.id;
  const { id } = req.params;
  if (!userId) {
    next(new AuthError('Authenticated user context is required.'));
    return;
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('user_devices')
      .delete()
      .eq('id', id)
      .eq('user_uuid', userId)
      .select()
      .single();

    if (error) throw error;

    if (data) {
      // Trigger Redis PubSub event to notify the device to log out
      const redis = await getRedisClient();
      if (redis) {
        await redis.publish(
          `device_approvals:${userId}`,
          JSON.stringify({
            event: 'device_resolved',
            device_fingerprint: data.device_fingerprint,
            status: 'DENIED',
            device_name: data.device_name
          })
        );
      }
    }

    res.json({ success: true, message: 'Device revoked successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * Action Endpoint: POST /api/devices/set-main
 * Marks a specific device as the Main Device (is_main: true) and all others as false.
 */
export async function setMainDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.id;
  const { device_fingerprint } = req.body;

  if (!userId) {
    next(new AuthError('Authenticated user context is required.'));
    return;
  }
  if (!device_fingerprint) {
    next(new ValidationError('device_fingerprint parameter is required.'));
    return;
  }

  try {
    // 1. Reset all devices for this user to is_main = false
    const { error: resetError } = await supabaseAdmin
      .from('user_devices')
      .update({ is_main: false })
      .eq('user_uuid', userId);
      
    if (resetError) {
      if (resetError.message.includes('column "is_main"')) {
        res.status(400).json({ 
          error: 'SUPABASE_SCHEMA_ERROR', 
          message: 'Please add a boolean column named "is_main" (default false) to your user_devices table in Supabase.'
        });
        return;
      }
      throw resetError;
    }

    // 2. Set the target device to is_main = true
    const { data: updatedDevice, error: updateError } = await supabaseAdmin
      .from('user_devices')
      .update({ is_main: true })
      .eq('user_uuid', userId)
      .eq('device_fingerprint', device_fingerprint)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!updatedDevice) {
      next(new NotFoundError('Device not found.'));
      return;
    }

    res.json({ success: true, device: updatedDevice });
  } catch (err) {
    next(err);
  }
}
