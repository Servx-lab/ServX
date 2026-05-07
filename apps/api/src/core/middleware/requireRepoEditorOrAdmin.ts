import type { Request, Response, NextFunction } from 'express';

const AdminModel = require('../../../models/Admin');
const AccessControlModel = require('../../../models/AccessControl');

function normalizeRepoKey(value: string): string {
  return value.trim().toLowerCase();
}

function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function isEditorOrAdminRole(role: string | undefined): boolean {
  const normalized = (role || '').toLowerCase();
  return normalized === 'owner' || normalized === 'editor' || normalized === 'admin';
}

function matchesRequestedRepo(requestedFullName: string, requestedRepoName: string, candidate: string): boolean {
  const normalizedCandidate = normalizeRepoKey(candidate);
  return normalizedCandidate === requestedFullName || normalizedCandidate.endsWith(`/${requestedRepoName}`);
}

/**
 * Allows only users with editor/admin-equivalent repo access in ServX.
 */
const requireRepoEditorOrAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const uid = req.user?.uid;
  const owner = getSingleParam(req.params?.owner as string | string[] | undefined).trim();
  const repo = getSingleParam(req.params?.repo as string | string[] | undefined).trim();

  if (!uid) {
    res.status(401).json({ message: 'Unauthorized: Missing authenticated user context' });
    return;
  }
  if (!owner || !repo) {
    res.status(400).json({ message: 'owner and repo route params are required' });
    return;
  }

  const requestedFullName = normalizeRepoKey(`${owner}/${repo}`);
  const requestedRepoName = normalizeRepoKey(repo);

  try {
    // Direct admin/editor users are allowed globally.
    const selfAdmin = await AdminModel.findOne({ uid }).select('role');
    if (isEditorOrAdminRole(selfAdmin?.role)) {
      next();
      return;
    }

    const accessRows = await AccessControlModel.find({ userUid: uid }).select('ownerUid permissions');
    if (!accessRows?.length) {
      res.status(403).json({ message: 'Forbidden: Editor/Admin access required for this repository' });
      return;
    }

    const ownerUids = [...new Set(accessRows.map((row: any) => String(row.ownerUid || '')).filter(Boolean))];
    const ownerAdmins = await AdminModel.find({ uid: { $in: ownerUids } }).select('uid role');
    const ownerRoles = new Map<string, string>(
      ownerAdmins.map((row: any) => [String(row.uid), String(row.role || '').toLowerCase()])
    );

    for (const row of accessRows as any[]) {
      const ownerUid = String(row.ownerUid || '');
      const ownerRole = ownerRoles.get(ownerUid);
      if (!isEditorOrAdminRole(ownerRole)) {
        continue;
      }

      const permissions = row.permissions || {};
      if (permissions.global?.isFullControl) {
        next();
        return;
      }

      const repoAllowList = permissions.granularAllow?.repoKeys;
      if (Array.isArray(repoAllowList) && repoAllowList.length > 0) {
        const inAllowList = repoAllowList.some((key: string) =>
          matchesRequestedRepo(requestedFullName, requestedRepoName, String(key || ''))
        );
        if (!inAllowList) {
          continue;
        }
      }

      const repoPermission = (permissions.repos || []).find((entry: any) =>
        matchesRequestedRepo(requestedFullName, requestedRepoName, String(entry?.name || ''))
      );
      const hasEditorLikeRepoPermission =
        !!repoPermission &&
        (repoPermission.canTriggerPipeline || repoPermission.canViewCommits || repoPermission.canViewLogs);

      if (hasEditorLikeRepoPermission) {
        next();
        return;
      }
    }

    res.status(403).json({ message: 'Forbidden: Editor/Admin access required for this repository' });
  } catch (err) {
    next(err);
  }
};

export default requireRepoEditorOrAdmin;
