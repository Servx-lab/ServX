const fs = require('fs');
const results = JSON.parse(fs.readFileSync('lint-results.json', 'utf8'));

const ruleSummary = {};
const fileSummary = {};

results.forEach(res => {
  if (res.messages.length > 0) {
    fileSummary[res.filePath] = res.messages.length;
    res.messages.forEach(msg => {
      ruleSummary[msg.ruleId] = (ruleSummary[msg.ruleId] || 0) + 1;
    });
  }
});

console.log('--- Rule Summary ---');
console.log(JSON.stringify(ruleSummary, null, 2));

console.log('\n--- Top 10 Problematic Files ---');
const sortedFiles = Object.entries(fileSummary).sort((a, b) => b[1] - a[1]).slice(0, 10);
console.log(JSON.stringify(sortedFiles, null, 2));
