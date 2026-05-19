#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import ora from 'ora';

const args = process.argv.slice(2);
const command = args[0];

// Support both `init <pin>` and `init --key=<pin>`
let pin = '';
if (args[1] && !args[1].startsWith('--')) {
    pin = args[1];
} else {
    const keyArg = args.find(a => a.startsWith('--key='));
    if (keyArg) pin = keyArg.split('=')[1];
}

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

function logError(msg: string) {
    console.error(`${colors.red}✖${colors.reset} ${msg}`);
}

if (command !== 'init') {
    console.log(`
${colors.blue}${colors.bold}ServX Command Line Interface${colors.reset}

Usage:
  npx @servx/cli init --key=<SERVX_PIN>
`);
    process.exit(1);
}

if (!pin) {
    logError('Missing required --key=<SERVX_PIN> parameter.');
    console.log(`Example: npx @servx/cli init --key=svx_a1b2c3d4e5f6`);
    process.exit(1);
}

const API_URL = process.env.SERVX_API_URL || 'http://localhost:5000';

async function performHandshake() {
    console.log(`\n${colors.bold}Initializing ServX Remote Kill Switch integration...${colors.reset}\n`);

    // --- TEST 1: Ping & Authentication ---
    const spinner1 = ora('Test 1: Authenticating PIN and connecting to Control Plane...').start();
    try {
        await axios.post(`${API_URL}/api/verify/ping`, { pin });
        spinner1.succeed('Test 1 Passed: Securely authenticated PIN.');
    } catch (err: any) {
        spinner1.fail('Test 1 Failed: ' + (err.response?.data?.message || err.message));
        process.exit(1);
    }

    // --- TEST 2: Environment Sync ---
    const spinner2 = ora('Test 2: Validating local framework environment...').start();
    try {
        let packageJson = {};
        const pkgPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(pkgPath)) {
            packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        }

        const frameworkData = {
            name: (packageJson as any).name || 'unknown-project',
            dependencies: (packageJson as any).dependencies || {},
            nodeVersion: process.version
        };

        await axios.post(`${API_URL}/api/verify/env`, { pin, frameworkData });
        spinner2.succeed('Test 2 Passed: Framework environment synchronized.');
    } catch (err: any) {
        spinner2.fail('Test 2 Failed: ' + (err.response?.data?.message || err.message));
        process.exit(1);
    }

    // --- TEST 3: Persistent SSE Firewall Check ---
    const spinner3 = ora('Test 3: Checking persistent SSE tunnel for remote signals...').start();
    try {
        // Axios waits for the entire stream to resolve (server ends connection after 3000ms)
        const response = await axios.get(`${API_URL}/api/verify/sse-test?pin=${pin}`);
        const responseData = response.data.toString();
        
        if (responseData.includes('VERIFIED')) {
            spinner3.succeed('Test 3 Passed: Live Persistent Signal Handshake VERIFIED.');
        } else {
            throw new Error('Did not receive VERIFIED signal from server.');
        }
    } catch (err: any) {
        spinner3.fail('Test 3 Failed: ' + (err.response?.data?.message || err.message));
        process.exit(1);
    }

    // --- FINAL: Inject Env Vars ---
    const envPath = path.join(process.cwd(), '.env');
    const envLocalPath = path.join(process.cwd(), '.env.local');
    const targetEnvFile = fs.existsSync(envLocalPath) ? envLocalPath : envPath;
    const targetEnvName = path.basename(targetEnvFile);

    let envContent = '';
    if (fs.existsSync(targetEnvFile)) {
        envContent = fs.readFileSync(targetEnvFile, 'utf-8');
    }

    if (envContent.includes('NEXT_PUBLIC_SERVX_PIN=') || envContent.includes('VITE_SERVX_PIN=')) {
        logInfo(`A ServX PIN is already configured in ${targetEnvName}. Skipped env write.`);
    } else {
        const appendStr = `\n# ServX Remote Maintenance Key\nNEXT_PUBLIC_SERVX_PIN=${pin}\nVITE_SERVX_PIN=${pin}\n`;
        fs.appendFileSync(targetEnvFile, appendStr);
        console.log(`\n${colors.green}✔${colors.reset} Successfully injected PIN into ${targetEnvName}.`);
    }

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

${colors.green}${colors.bold}Your codebase is now completely VERIFIED and securely connected to the ServX Control Plane!${colors.reset}
`);
}

performHandshake();
