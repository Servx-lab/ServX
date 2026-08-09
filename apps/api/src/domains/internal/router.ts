import { Router, type Request, type Response, type NextFunction } from 'express';
import { getGithubToken } from '../../domains/github/service';
import { getUserInstallationToken } from '../../services/githubInstallationTokenStore';

const router = Router();

/**
 * Middleware: Validates a shared service token for internal API access.
 * The token is set via the SERVICE_AUTH_TOKEN env var on both the Main-UI API
 * and the trusted service (Exposure Analysis).
 */
function requireServiceToken(req: Request, res: Response, next: NextFunction): void {
  const provided = req.header('X-Service-Token')?.trim();
  const expected = process.env.SERVICE_AUTH_TOKEN?.trim();

  if (!expected) {
    res.status(503).json({ error: 'Service auth not configured on Main API.' });
    return;
  }

  if (!provided || provided !== expected) {
    res.status(401).json({ error: 'Unauthorized: invalid service token.' });
    return;
  }

  next();
}

router.use(requireServiceToken);

/**
 * GET /api/internal/github-token?userId=<supabase_uid>
 * Returns the user's GitHub access token for use by trusted services.
 *
 * Tries the GitHub App installation token first (higher rate limits),
 * falls back to the OAuth token from github_vault.
 */
router.get('/github-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.query.userId || '').trim();

    if (!userId) {
      res.status(400).json({ error: 'userId query parameter is required.' });
      return;
    }

    // Try installation token first (GitHub App — 5,000 req/hour per installation)
    try {
      const installationToken = await getUserInstallationToken(userId);
      if (installationToken) {
        res.json({ token: installationToken, source: 'github_app' });
        return;
      }
    } catch {
      // Fall through to OAuth token
    }

    // Fall back to OAuth token from Supabase github_vault
    try {
      const { accessToken } = await getGithubToken(userId);
      if (accessToken) {
        res.json({ token: accessToken, source: 'oauth' });
        return;
      }
    } catch {
      // No token available
    }

    res.status(404).json({ error: 'GitHub not connected for this user.' });
  } catch (error) {
    next(error);
  }
});

export default router;
