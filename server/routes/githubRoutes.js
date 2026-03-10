const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Middleware to authenticate user and get GitHub token from DB
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.ENCRYPTION_KEY || 'secret');
    const user = await User.findById(decoded.userId).select('+githubAccessToken');
    
    if (!user || !user.githubAccessToken) {
      return res.status(401).json({ error: 'User not found or not connected to GitHub' });
    }
    
    req.githubToken = user.githubAccessToken;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// GET /api/github/repos
// Fetches all repositories for the authenticated user
router.get('/repos', authenticate, async (req, res) => {
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
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// GET /api/github/repos/:owner/:repo/details
// Fetches comprehensive details: repo info, last 50 commits, contributors
router.get('/repos/:owner/:repo/details', authenticate, async (req, res) => {
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

    // Format Deployments
    const formattedDeployments = deploymentsResponse.data.map(dep => ({
      id: dep.id,
      environment: dep.environment,
      state: dep.state,
      created_at: dep.created_at,
      creator: dep.creator?.login,
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

module.exports = router;