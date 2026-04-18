import { graphql } from '@octokit/graphql';

import { ValidationError } from '@servx/errors';

type VulnerabilityAlertNode = {
  securityVulnerability?: {
    package?: { name?: string };
    severity?: string;
    vulnerableVersionRange?: string;
    firstPatchedVersion?: { identifier?: string } | null;
    advisory?: {
      summary?: string;
      cvss?: { score?: number } | null;
    } | null;
  } | null;
  createdAt?: string;
};

type VulnerabilityAlertsResponse = {
  repository?: {
    vulnerabilityAlerts?: {
      totalCount?: number;
      nodes?: VulnerabilityAlertNode[];
    } | null;
  } | null;
};

const VULNERABILITY_ALERTS_QUERY = `
query($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    vulnerabilityAlerts(first: 50, states: OPEN) {
      totalCount
      nodes {
        securityVulnerability {
          package { name }
          severity
          vulnerableVersionRange
          firstPatchedVersion { identifier }
          advisory {
            summary
            cvss { score }
          }
        }
        createdAt
      }
    }
  }
}
`;

export async function fetchRepoSecurityData(owner: string, repo: string, token: string): Promise<{
  totalCount: number;
  nodes: VulnerabilityAlertNode[];
}> {
  const safeOwner = owner?.trim();
  const safeRepo = repo?.trim();
  const safeToken = token?.trim();

  if (!safeOwner || !safeRepo) {
    throw new ValidationError('Repository owner and repo name are required.');
  }
  if (!safeToken) {
    throw new ValidationError('GitHub App installation token is missing.');
  }

  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${safeToken}`,
    },
  });

  const result = await graphqlWithAuth<VulnerabilityAlertsResponse>(VULNERABILITY_ALERTS_QUERY, {
    owner: safeOwner,
    repo: safeRepo,
  });

  const alerts = result.repository?.vulnerabilityAlerts;
  return {
    totalCount: alerts?.totalCount ?? 0,
    nodes: alerts?.nodes ?? [],
  };
}
