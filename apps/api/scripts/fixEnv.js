const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const lines = fs.readFileSync(envPath, 'utf8').split('\n');

const newLines = lines.filter(line => !line.startsWith('GOOGLE_SHEETS_PRIVATE_KEY=') && !line.includes('PRIVATE KEY'));

const privateKey = `-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDM64tsbabB04k9\\nz2tQjKLsNOnM2etBaJaDtdW7r43Z02+hA8ES1cgMfYmhzG6vj+IlRC3UYh4G7CqN\\nQNsda2VPCuemovUxLBYL7QfAInWBu922wkUNT/RRfsPteT25DoSCcOcKxQOEjAZs\\nb9FhzPHy+O+DaO6Nwi/YtqTCJmQ06/bwbOBgjUJ3u7pN5KQOPNx3TNuum2UcoJnu\\nE+qNADLkj7dpRhU0wuBv3aNEyCSH2LVbhYSiqPBC75wfN9QMHlben1fK9BIPzVTo\\nrsGRMWQGZtYF6ta3iPn2rvWbIjLNybFjcvXxUuf3CZlGwGxXoLYP7M6xCD/T4290\\n2R7YTD/9AgMBAAECggEACqBF1CzB2PGYzEiIaBGvremQgu7jiocoRuwtVe4xWa19\\nIskiQFFibkNhDHxtWobVIAzJBs2PtD9kdXt6rhJDm2jiJxUlyC1hEOOmfNZ/zjQC\\n6z2a49w7IkuDtwZY2dL6GOMbfmBFyAaUaEsXSg42l0LeKKvoTH5YiZ3u+gjDnK4H\\n22eDYPtnCnHHMM60D9pHVw1ITr6BUnvaizGUnpTuEeEMmpWGhohRZ4o1TScdPu/2\\nQYvHhs9vKdK/zxx4zvcvlXYr+JEH+ioKMh98Ku0UdpXVFy7zoDxoe9C0dVciJA/N\\nQl21rp5/c+RsRbso0iXLHZ+xnL9+MaBz9O1dse34gQKBgQD/OTAhq3vlJlGEjdhQ\\nT7S27RucurobUmbwrT9yGzx1oBQuBBYPKbgcum18/p49XtQjr/MU1YYhW67+MSRG\\n2azKfIw2Uc6Yz/3m062mf+lvcc8dnvCCeJBg6B6rAqAFHt91oxFaMGupHY3YzJ03\\nvKQLjJZrC48dvgddi2xIX/puNwKBgQDNiyv2eWDKUP3ab9CpL7Yg3As1IK9ii0gb\\nduCJjAsaSKWYL/7DzxtIDvVzGR2MjMijJ1IdaBeCwYD532lApPHmESEBBqFVsa1a\\nmsiWL3B/okfGXf7Rah4HFNyvYh8GB7fA5DH/GoB13voNVO/4TZ7+R8+ysDdyFeN\\nKuRxwyHJawKBgH54/Fzy+WZIYsTo9XR2yvqK7M/xyB+Z6eECORp2XLN9LALRi4zg\\nA5hY2cDC++81erJkknSUiu8k28ai23MwkuuUZHbWeyZGi29DHh4P7MGJCDWJeW1u\\nCT28SNY9asae0eUddY/XxsH7Hzt7ybzBAhmnBTLue3Elpci5OmNzDEppAoGBAJ9p\\nbLM/9/1xSzB6wA43Xr2la1vM+bkn5MjILeT/pCzCYwvhTWl32uTMFTkrJWu4VHOV\\nL253KKTUhr9EslDcnH+eoUY2ajIYFybKHP+90zZqGdiTVen8r0U2vOGY7A61NaJ4\\nWP5NA4xnXu+wDF07iGgmEkGU5ngbxStLNNm2SSH5AoGAKon1BF5EbSKWaNDHSkhp\\n35WIkUXzaE0puRzqxF7b5iwqNMBclNkoGpLqFn2Hx+LJs0bZjixP8PrgYGOCjXH0\\nec3p0QQ8HDcQ1CfWEp5lB4I91U+bhbpZfEMrtNyAuQDpcPXY1oZooyseUeeyXCXd\\nX8h5yiR8Q9pgzsqMehJp5a0=\\n-----END PRIVATE KEY-----\\n`;

newLines.push(`GOOGLE_SHEETS_PRIVATE_KEY="${privateKey}"`);

fs.writeFileSync(envPath, newLines.join('\n').trim() + '\n');
console.log('.env file updated successfully');
