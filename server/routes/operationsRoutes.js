const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const UserConnection = require('../models/UserConnection');
const { decrypt } = require('../utils/encryption');

/**
 * Fetches and decrypts user's hosting credentials from DB (per Firebase UID).
 * Returns { token } or null if not found / decrypt fails.
 */
async function getHostingCredentials(ownerUid, provider) {
  const dbName = provider === 'vercel' ? 'Vercel' : provider === 'render' ? 'Render' : null;
  if (!dbName) return null;
  const connection = await UserConnection.findOne({ ownerUid, provider: dbName });
  if (!connection) return null;
  try {
    const decrypted = decrypt({ iv: connection.iv, content: connection.encryptedConfig });
    const parsed = JSON.parse(decrypted);
    const token = parsed.token || parsed.apiKey;
    return token ? { token, edgeConfigId: parsed.edgeConfigId } : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/operations/projects
 * Fetches projects from Vercel and Render using user's DB-stored credentials.
 * Uses Promise.allSettled so one API failure doesn't crash the whole request.
 */
router.get('/projects', requireAuth, async (req, res) => {
  try {
    const ownerUid = req.user.uid;
    const [vercelCreds, renderCreds] = await Promise.all([
      getHostingCredentials(ownerUid, 'vercel'),
      getHostingCredentials(ownerUid, 'render'),
    ]);

    const [vercelResult, renderResult] = await Promise.allSettled([
      vercelCreds?.token
        ? fetch('https://api.vercel.com/v9/projects', {
            headers: { Authorization: `Bearer ${vercelCreds.token}` },
          }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Vercel ${r.status}`))))
        : Promise.resolve({ projects: [] }),
      renderCreds?.token
        ? fetch('https://api.render.com/v1/services', {
            headers: { Authorization: `Bearer ${renderCreds.token}` },
          }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Render ${r.status}`))))
        : Promise.resolve([]),
    ]);

    const projects = [];

    if (vercelResult.status === 'fulfilled') {
      const data = vercelResult.value;
      const vercelProjects = Array.isArray(data) ? data : data?.projects || [];
      vercelProjects.forEach((p) => {
        projects.push({
          id: p.id,
          name: p.name || 'Unnamed',
          provider: 'vercel',
          status: p.readyState || p.state || 'unknown',
          framework: p.framework || p.settings?.framework || 'unknown',
        });
      });
    } else {
      console.warn('[Operations] Vercel projects fetch failed:', vercelResult.reason?.message);
    }

    if (renderResult.status === 'fulfilled') {
      const data = renderResult.value;
      const renderServices = Array.isArray(data) ? data : data?.services || [];
      renderServices.forEach((s) => {
        const svc = s.service || s;
        const suspended = svc.suspended === 'suspended' || s.suspended === 'suspended';
        projects.push({
          id: svc.id || s.id,
          name: svc.name || s.name || 'Unnamed',
          provider: 'render',
          status: suspended ? 'suspended' : 'active',
          framework: svc.serviceDetails?.runtime || svc.type || s.type || 'unknown',
        });
      });
    } else {
      console.warn('[Operations] Render services fetch failed:', renderResult.reason?.message);
    }

    res.json({ projects });
  } catch (err) {
    console.error('[Operations] GET /projects error:', err);
    res.status(500).json({ projects: [], error: err.message });
  }
});

/**
 * POST /api/operations/toggle-maintenance
 * Securely toggles maintenance mode using user's DB-stored credentials.
 * Accepts projectId (Vercel project id or Render service id) and provider.
 */
router.post('/toggle-maintenance', requireAuth, async (req, res) => {
  try {
    const { projectId, provider, isEnabled } = req.body;
    const ownerUid = req.user.uid;

    if (!projectId || typeof isEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid projectId or isEnabled',
      });
    }

    const prov = (provider || '').toLowerCase();

    if (prov === 'vercel') {
      const creds = await getHostingCredentials(ownerUid, 'vercel');
      if (!creds?.token) {
        return res.status(400).json({
          success: false,
          message: 'Vercel not connected. Add your Vercel token in Hosting & Servers.',
        });
      }

      let edgeConfigId = creds.edgeConfigId;
      if (!edgeConfigId) {
        const ecRes = await fetch('https://api.vercel.com/v1/edge-config', {
          headers: { Authorization: `Bearer ${creds.token}` },
        });
        if (!ecRes.ok) {
          return res.status(400).json({
            success: false,
            message: 'Could not fetch Edge Configs. Add edgeConfigId to your Vercel connection config.',
          });
        }
        const ecList = await ecRes.json();
        const configs = Array.isArray(ecList) ? ecList : ecList?.edgeConfigs || [];
        const match = configs.find((c) => c.purpose?.projectId === projectId) || configs[0];
        edgeConfigId = match?.id;
      }
      if (!edgeConfigId) {
        return res.status(400).json({
          success: false,
          message: 'No Edge Config found. Create one in Vercel or add edgeConfigId to your connection.',
        });
      }

      const url = `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${creds.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            { operation: 'upsert', key: 'maintenance_mode', value: isEnabled },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[Operations] Vercel Edge Config error:', response.status, errText);
        return res.status(response.status).json({
          success: false,
          message: `Vercel API error: ${response.status}`,
          details: errText,
        });
      }

      return res.json({
        success: true,
        message: isEnabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
        provider: 'vercel',
      });
    }

    if (prov === 'render') {
      const creds = await getHostingCredentials(ownerUid, 'render');
      if (!creds?.token) {
        return res.status(400).json({
          success: false,
          message: 'Render not connected. Add your Render API key in Hosting & Servers.',
        });
      }

      const action = isEnabled ? 'suspend' : 'resume';
      const url = `https://api.render.com/v1/services/${projectId}/${action}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[Operations] Render API error:', response.status, errText);
        return res.status(response.status).json({
          success: false,
          message: `Render API error: ${response.status}`,
          details: errText,
        });
      }

      return res.json({
        success: true,
        message: isEnabled ? 'Service suspended' : 'Service resumed',
        provider: 'render',
      });
    }

    return res.status(400).json({
      success: false,
      message: `Unsupported or missing provider. Use 'vercel' or 'render'.`,
    });
  } catch (err) {
    console.error('[Operations] toggle-maintenance error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to toggle maintenance mode',
    });
  }
});

module.exports = router;
