import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface MaterializedFile {
  path: string;
  sha: string;
  size: number;
  content?: string;
}

export interface MaterializedRepo {
  workDir: string;
  files: MaterializedFile[];
  defaultBranch: string;
}

/**
 * Fetches repository file tree and key blob contents from GitHub via REST API,
 * writing them to a temporary workspace for AST analysis and sandboxed execution.
 */
export async function materializeRepoFromGitHub(params: {
  jobId: string;
  repoFullName: string;
  accessToken: string;
  maxFilesToFetch?: number;
}): Promise<MaterializedRepo> {
  const { jobId, repoFullName, accessToken, maxFilesToFetch = 30 } = params;
  const [owner, repo] = repoFullName.split('/');

  if (!owner || !repo) {
    throw new Error(`Invalid repoFullName: ${repoFullName}`);
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `token ${accessToken}`,
    'User-Agent': 'ServX-AttackPaths-Worker',
  };

  // 1. Get repository metadata to determine default branch
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    throw new Error(`Failed to fetch repo info (${repoRes.status}): ${await repoRes.text()}`);
  }
  const repoData: any = await repoRes.json();
  const defaultBranch = repoData.default_branch || 'main';

  // 2. Fetch recursive git tree
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers });
  if (!treeRes.ok) {
    throw new Error(`Failed to fetch git tree (${treeRes.status}): ${await treeRes.text()}`);
  }
  const treeData: any = await treeRes.json();
  const tree: any[] = treeData.tree || [];

  // Filter for relevant code files
  const codeFiles = tree.filter((item) => {
    if (item.type !== 'blob') return false;
    const p = item.path;
    // skip node_modules, dist, build, images, lockfiles
    if (p.includes('node_modules/') || p.includes('dist/') || p.includes('build/') || p.includes('.git/')) return false;
    if (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.lock') || p.endsWith('-lock.json')) return false;
    // prioritize ts, js, py, go, sql, json
    return /\.(ts|js|tsx|jsx|py|go|java|sql|json)$/i.test(p);
  });

  // Sort: prioritize routes, controllers, middleware, services, models
  codeFiles.sort((a, b) => {
    const score = (p: string) => {
      let s = 0;
      if (/(route|router|controller|middleware|auth|guard|sink|db|sql|query|api)/i.test(p)) s += 10;
      if (p.endsWith('.ts') || p.endsWith('.js')) s += 5;
      return s;
    };
    return score(b.path) - score(a.path);
  });

  const selectedFiles = codeFiles.slice(0, maxFilesToFetch);
  const workDir = path.join(os.tmpdir(), 'servx-attack-paths', jobId, repoFullName.replace('/', '_'));
  await fs.mkdir(workDir, { recursive: true });

  const materializedFiles: MaterializedFile[] = [];

  // 3. Fetch blobs for selected files
  for (const fileItem of selectedFiles) {
    try {
      const blobRes = await fetch(fileItem.url || `https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileItem.sha}`, {
        headers,
      });
      if (!blobRes.ok) continue;

      const blobData: any = await blobRes.json();
      let content = '';
      if (blobData.encoding === 'base64' && blobData.content) {
        content = Buffer.from(blobData.content, 'base64').toString('utf8');
      }

      const filePath = path.join(workDir, fileItem.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf8');

      materializedFiles.push({
        path: fileItem.path,
        sha: fileItem.sha,
        size: fileItem.size || content.length,
        content,
      });
    } catch (err) {
      console.warn(`[repoMaterializer] Failed to fetch blob for ${fileItem.path}:`, err);
    }
  }

  return {
    workDir,
    files: materializedFiles,
    defaultBranch,
  };
}
