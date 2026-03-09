const express = require('express');
const { Octokit } = require('@octokit/rest');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// GET /api/github/repos
router.get('/repos', async (req, res) => {
  try {
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100, // Fetch up to 100 repositories
      sort: 'updated',
      direction: 'desc',
    });

    const detailedRepos = await Promise.all(
      repos.map(async (repo) => {
        try {
          // Fetch languages for each repo
          const { data: languages } = await octokit.rest.repos.listLanguages({
            owner: repo.owner.login,
            repo: repo.name,
          });
          return { ...repo, languages };
        } catch (langError) {
          console.error(`Error fetching languages for ${repo.name}:`, langError.message);
          return { ...repo, languages: {} };
        }
      })
    );

    res.json(detailedRepos);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// GET /api/github/repos/:repoName/stack
router.get('/repos/:repoName/stack', async (req, res) => {
  const { repoName } = req.params;
  try {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    const owner = user.login;

    try {
      const { data: content } = await octokit.rest.repos.getContent({
        owner,
        repo: repoName,
        path: 'package.json',
      });

      const decodedContent = Buffer.from(content.content, 'base64').toString('utf-8');
      const packageJson = JSON.parse(decodedContent);
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const stack = [];
      const mapping = {
        'react': 'React',
        'vue': 'Vue',
        'angular': 'Angular',
        'express': 'Express.js',
        'next': 'Next.js',
        'mongoose': 'MongoDB',
        'pg': 'PostgreSQL',
        'mysql': 'MySQL',
        'tailwindcss': 'Tailwind CSS',
        'typescript': 'TypeScript'
      };

      Object.keys(dependencies).forEach(dep => {
        if (mapping[dep]) stack.push(mapping[dep]);
      });

      res.json({ stack: [...new Set(stack)] });
    } catch (fileError) {
      // package.json may not exist, return empty
      res.json({ stack: [] });
    }
  } catch (error) {
    console.error('Error fetching stack:', error);
    res.status(500).json({ error: 'Failed to analyze stack' });
  }
});

// GET /api/github/repos/:repoName/commits
router.get('/repos/:repoName/commits', async (req, res) => {
  const { repoName } = req.params;
  try {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    const owner = user.login;

    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo: repoName,
      per_page: 30,
    });

    const formattedCommits = commits.map(commit => ({
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      sha: commit.sha,
    }));

    res.json(formattedCommits);
  } catch (error) {
    console.error('Error fetching commits:', error);
    res.status(500).json({ error: 'Failed to fetch commits' });
  }
});

module.exports = router;