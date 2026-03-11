const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { Octokit } = require('@octokit/rest');
const User = require('../models/User');

const router = express.Router();

const requireAuth = require('../middleware/requireAuth');

// Middleware to authenticate user and get GitHub token from DB using Firebase UID
const authenticate = async (req, res, next) => {
  // requireAuth is expected to be called before this or integrated
  const uid = req.user.uid;
  try {
    const user = await User.findOne({ uid }).select('+githubAccessToken');
    
    if (!user) {
      console.log('[GitHub Auth] User not found in DB for UID:', uid);
      return res.status(401).json({ error: 'User record not found in database.' });
    }

    if (!user.githubAccessToken) {
      console.log('[GitHub Auth] GitHub token missing for user:', uid);
      return res.status(401).json({ error: 'GitHub account not connected.' });
    }
    
    req.githubToken = user.githubAccessToken;
    next();
  } catch (error) {
    console.error('GitHub Auth Error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/github/repos
// Fetches all repositories for the authenticated user
router.get('/repos', requireAuth, authenticate, async (req, res) => {
  try {
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${req.githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
      params: {
        sort: 'updated',
        per_page: 100,
      },
    });

    const repos = response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name, // e.g., 'owner/repo'
      description: repo.description,
      html_url: repo.html_url,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      updated_at: repo.updated_at,
      owner: {
        login: repo.owner.login,
        avatar_url: repo.owner.avatar_url,
      }
    }));

    res.json(repos);
  } catch (error) {
    console.error('GitHub Repos Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'GitHub token invalid or expired.' });
    }
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// GET /api/github/repos/:owner/:repo/details
// Fetches comprehensive details: repo info, last 50 commits, contributors
router.get('/repos/:owner/:repo/details', requireAuth, authenticate, async (req, res) => {
  const { owner, repo } = req.params;
  const repoFullName = `${owner}/${repo}`;

  try {
    // 1. Fetch Repository Details
    const repoDetailsPromise = axios.get(`https://api.github.com/repos/${repoFullName}`, {
      headers: { Authorization: `Bearer ${req.githubToken}` },
    });

    // 2. Fetch Last 50 Commits
    const commitsPromise = axios.get(`https://api.github.com/repos/${repoFullName}/commits`, {
      headers: { Authorization: `Bearer ${req.githubToken}` },
      params: { per_page: 50 },
    });

    // 3. Fetch Contributors
    const contributorsPromise = axios.get(`https://api.github.com/repos/${repoFullName}/contributors`, {
      headers: { Authorization: `Bearer ${req.githubToken}` },
      params: { per_page: 100 },
    });

    // 4. Fetch Languages
    const languagesPromise = axios.get(`https://api.github.com/repos/${repoFullName}/languages`, {
      headers: { Authorization: `Bearer ${req.githubToken}` },
    });

    // 5. Fetch Deployments
    const deploymentsPromise = axios.get(`https://api.github.com/repos/${repoFullName}/deployments`, {
      headers: { Authorization: `Bearer ${req.githubToken}` },
      params: { per_page: 6 },
    });

    const [repoResponse, commitsResponse, contributorsResponse, languagesResponse, deploymentsResponse] = await Promise.all([
        repoDetailsPromise,
        commitsPromise,
        contributorsPromise,
        languagesPromise,
        deploymentsPromise
    ]);

    // Format Data
    const formattedCommits = commitsResponse.data.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      url: commit.html_url,
    }));

    const formattedContributors = contributorsResponse.data.map(contributor => ({
      login: contributor.login,
      avatar_url: contributor.avatar_url,
      contributions: contributor.contributions,
      html_url: contributor.html_url,
    }));

    // Format Languages
    const formattedLanguages = Object.entries(languagesResponse.data).map(([name, bytes]) => ({
      name,
      bytes: Number(bytes),
    })).sort((a, b) => b.bytes - a.bytes); // Sort descending

    // Format Deployments -- resolve creator display names in parallel
    const deploymentCreatorLogins = [...new Set(
      deploymentsResponse.data.map(dep => dep.creator?.login).filter(Boolean)
    )];
    const creatorProfiles = {};
    await Promise.all(deploymentCreatorLogins.map(async (login) => {
      try {
        const profile = await axios.get(`https://api.github.com/users/${login}`, {
          headers: { Authorization: `Bearer ${req.githubToken}` },
        });
        creatorProfiles[login] = profile.data.name || login;
      } catch {
        creatorProfiles[login] = login;
      }
    }));

    const formattedDeployments = deploymentsResponse.data.map(dep => ({
      id: dep.id,
      environment: dep.environment,
      state: dep.state,
      created_at: dep.created_at,
      creator: creatorProfiles[dep.creator?.login] || dep.creator?.login,
      creator_login: dep.creator?.login,
      creator_avatar: dep.creator?.avatar_url,
      url: dep.html_url || dep.statuses_url,
    }));

    res.json({
      details: {
        id: repoResponse.data.id,
        name: repoResponse.data.name,
        full_name: repoResponse.data.full_name,
        private: repoResponse.data.private,
        html_url: repoResponse.data.html_url,
        description: repoResponse.data.description,
        created_at: repoResponse.data.created_at,
        updated_at: repoResponse.data.updated_at,
        language: repoResponse.data.language,
        stars: repoResponse.data.stargazers_count,
        forks: repoResponse.data.forks_count,
        open_issues: repoResponse.data.open_issues_count,
      },
      commits: formattedCommits,
      contributors: formattedContributors,
      languages: formattedLanguages,
      deployments: formattedDeployments,
    });

  } catch (error) {
    console.error(`GitHub Details Error for ${repoFullName}:`, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch repository details' });
  }
});

// POST /api/github/collaborator/role
// Updates a collaborator's permission (locked = read, unlocked = push)
router.post('/collaborator/role', requireAuth, authenticate, async (req, res) => {
  const { repoName, githubUsername, status } = req.body;

  if (!repoName || !githubUsername || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const [owner, repo] = repoName.split('/');
  if (!owner || !repo) {
    return res.status(400).json({ error: 'Invalid repoName format. Expected owner/repo' });
  }

  try {
    const octokit = new Octokit({ auth: req.githubToken });
    const permission = status === 'locked' ? 'read' : 'push';

    await octokit.rest.repos.addCollaborator({
      owner,
      repo,
      username: githubUsername,
      permission,
    });

    res.json({ success: true, message: `Successfully updated ${githubUsername} to ${permission} access.` });
  } catch (error) {
    console.error('GitHub Collaborator Role Error:', error.response?.data || error.message);
    res.status(error.status || 500).json({ error: 'Failed to update collaborator role' });
  }
});

module.exports = router;