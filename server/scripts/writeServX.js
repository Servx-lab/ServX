const fs = require('fs');
const path = require('path');

const key = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDM64tsbabB04k9
z2tQjKLsNOnM2etBaJaDtdW7r43Z02+hA8ES1cgMfYmhzG6vj+IlRC3UYh4G7CqN
QNsda2VPCuemovUxLBYL7QfAInWBu922wkUNT/RRfsPteT25DoSCcOcKxQOEjAZs
b9FhzPHy+O+DaO6Nwi/YtqTCJmQ06/bwbOBgjUJ3u7pN5KQOPNx3TNuum2UcoJnu
E+qNADLkj7dpRhU0wuBv3aNEyCSH2LVbhYSiqPBC75wfN9QMHlben1fK9BIPzVTo
rsGRMWQGZtYF6ta3iPn2rvWbIjLNybFjcvXxUuf3CZlGwGxXoLYP7M6xCD/T4290
2R7YTD/9AgMBAAECggEACqBF1CzB2PGYzEiIaBGvremQgu7jiocoRuwtVe4xWa19
IskiQFFibkNhDHxtWobVIAzJBs2PtD9kdXt6rhJDm2jiJxUlyC1hEOOmfNZ/zjQC
6z2a49w7IkuDtwZY2dL6GOMbfmBFyAaUaEsXSg42l0LeKKvoTH5YiZ3u+gjDnK4H
22eDYPtnCnHHMM60D9pHVw1ITr6BUnvaizGUnpTuEeEMmpWGhohRZ4o1TScdPu/2
QYvHhs9vKdK/zxx4zvcvlXYr+JEH+ioKMh98Ku0UdpXVFy7zoDxoe9C0dVciJA/N
Ql21rp5/c+RsRbso0iXLHZ+xnL9+MaBz9O1dse34gQKBgQD/OTAhq3vlJlGEjdhQ
T7S27RucurobUmbwrT9yGzx1oBQuBBYPKbgcum18/p49XtQjr/MU1YYhW67+MSRG
2azKfIw2Uc6Yz/3m062mf+lvcc8dnvCCeJBg6B6rAqAFHt91oxFaMGupHY3YzJ03
vKQLjJZrC48dvgddi2xIX/puNwKBgQDNiyv2eWDKUP3ab9CpL7Yg3As1IK9ii0gb
duCJjAsaSKWYL/7DzxtIDvVzGR2MjMijJ1IdaBeCwYD532lApPHmESEBBqFVsa1a
msiWL3B/okfGXf7Rah4HFNyvYh8GB7fA5DH/GoB13voNVO/4TZ7+R8+ysDdyFeN
KuRxwyHJawKBgH54/Fzy+WZIYsTo9XR2yvqK7M/xyB+Z6eECORp2XLN9LALRi4zg
A5hY2cDC++81erJkknSUiu8k28ai23MwkuuUZHbWeyZGi29DHh4P7MGJCDWJeW1u
CT28SNY9asae0eUddY/XxsH7Hzt7ybzBAhmnBTLue3Elpci5OmNzDEppAoGBAJ9p
bLM/9/1xSzB6wA43Xr2la1vM+bkn5MjILeT/pCzCYwvhTWl32uTMFTkrJWu4VHOV
L253KKTUhr9EslDcnH+eoUY2ajIYFybKHP+90zZqGdiTVen8r0U2vOGY7A61NaJ4
WP5NA4xnXu+wDF07iGgmEkGU5ngbxStLNNm2SSH5AoGAKon1BF5EbSKWaNDHSkhp
35WIkUXzaE0puRzqxF7b5iwqNMBclNkoGpLqFn2Hx+LJs0bZjixP8PrgYGOCjXH0
nec3p0QQ8HDcQ1CfWEp5lB4I91U+bhbpZfEMrtNyAuQDpcPXY1oZooyseUeeyXCXd
X8h5yiR8Q9pgzsqMehJp5a0=
-----END PRIVATE KEY-----`;

const creds = {
  "client_email": "servx-822@servx-490403.iam.gserviceaccount.com",
  "private_key": key
};

fs.writeFileSync(path.join(__dirname, '..', 'ServX.json'), JSON.stringify(creds, null, 2));
console.log('ServX.json written with real newlines.');
