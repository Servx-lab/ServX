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

module.exports = router;