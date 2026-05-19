#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const command = args[0];
const pin = args[1];

const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    blue: "\x1b[34m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    bold: "\x1b[1m",
};

function logInfo(msg: string) {
    console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`);
}

function logSuccess(msg: string) {
    console.log(`${colors.green}✔${colors.reset} ${colors.bold}${msg}${colors.reset}`);
}

function logError(msg: string) {
    console.error(`${colors.red}✖${colors.reset} ${msg}`);
}

if (command !== 'init') {
    console.log(`
${colors.blue}${colors.bold}ServX Command Line Interface${colors.reset}

Usage:
  npx @servx/cli init <SERVX_PIN>
`);
    process.exit(1);
}

if (!pin) {
    logError('Missing required <SERVX_PIN> parameter.');
    console.log(`Example: npx @servx/cli init svx_a1b2c3d4e5f6`);
    process.exit(1);
}

logInfo('Initializing ServX Remote Kill Switch integration...');

const envPath = path.join(process.cwd(), '.env');
const envLocalPath = path.join(process.cwd(), '.env.local');

// Determine which env file to write to (Next.js prefers .env.local, Vite prefers .env)
const targetEnvFile = fs.existsSync(envLocalPath) ? envLocalPath : envPath;
const targetEnvName = path.basename(targetEnvFile);

let envContent = '';
if (fs.existsSync(targetEnvFile)) {
    envContent = fs.readFileSync(targetEnvFile, 'utf-8');
}

if (envContent.includes('NEXT_PUBLIC_SERVX_PIN=') || envContent.includes('VITE_SERVX_PIN=')) {
    logError(`A ServX PIN is already configured in ${targetEnvName}.`);
    process.exit(1);
}

// Automatically add for both Vite and Next.js environments so it works universally
const appendStr = `\n# ServX Remote Maintenance Key\nNEXT_PUBLIC_SERVX_PIN=${pin}\nVITE_SERVX_PIN=${pin}\n`;
fs.appendFileSync(targetEnvFile, appendStr);

logSuccess(`Successfully injected PIN into ${targetEnvName}.`);

console.log(`
${colors.bold}Next Steps:${colors.reset}
1. Install the React SDK:
   ${colors.yellow}npm install @servx/react${colors.reset}
   
2. Wrap your application tree (e.g., in layout.tsx or main.tsx):

   ${colors.cyan}import { ServXProvider } from '@servx/react';${colors.reset}

   export default function RootLayout({ children }) {
     return (
       ${colors.cyan}<ServXProvider projectKey={process.env.NEXT_PUBLIC_SERVX_PIN || import.meta.env.VITE_SERVX_PIN}>${colors.reset}
         {children}
       ${colors.cyan}</ServXProvider>${colors.reset}
     );
   }

${colors.green}Your codebase is now securely connected to the ServX Control Plane!${colors.reset}
`);
