import crypto from 'crypto';
import { supabaseAdmin } from '../utils/supabaseAdmin.js';

interface ErrorCase {
  name: string;
  stackOverride: string;
  diagnosis: string;
  fix: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

// --- Logic: Normalize Trace (Must match errorAnalyzer.service.js) ---
function normalizeTrace(stack: string): string {
  if (!stack) return '';
  return stack
    // 1. Remove absolute file paths and line/column numbers 
    // (e.g., "C:\Users\..." or "/home/user/..." and ":12:34")
    .replace(/\(?([a-zA-Z]:)?[\\/][^:)\s]+(:\d+)?(:\d+)?\)?/g, '')
    // 2. Remove timestamps (e.g., "2026-05-10T12:00:00.000Z")
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '')
    // 3. Remove memory addresses (e.g., "0x000000000")
    .replace(/0x[a-fA-F0-9]+/g, '0xMEM')
    // 4. Remove UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<UUID>')
    // 5. Cleanup whitespace and standardize format
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

// --- Logic: Generate Signature (Must match errorAnalyzer.service.js) ---
function generateSignature(normalizedStack: string): string {
  return crypto
    .createHash('sha256')
    .update(normalizedStack)
    .digest('hex');
}

// --- The Knowledge Base: Common Patterns ---
const commonErrors: ErrorCase[] = [
  {
    name: "MongoTimeoutError",
    stackOverride: "MongooseServerSelectionError: Connect to cluster0.mongodb.net:27017 timed out",
    diagnosis: "MongoDB Connection Timeout. The application could not reach the database cluster within the default 30s window.",
    fix: "// Check your IP Whitelist in MongoDB Atlas\n// Ensure your current IP is allowed in Network Access",
    severity: "MEDIUM"
  },
  {
    name: "MongoAuthError",
    stackOverride: "MongoServerError: bad auth : Authentication failed.",
    diagnosis: "MongoDB Authentication Failed. The provided username or password in the connection string is incorrect.",
    fix: "// Check MONGODB_URI format in .env\n// Ensure special characters in password are URL encoded",
    severity: "MEDIUM"
  },
  {
    name: "DuplicateKeyError",
    stackOverride: "MongoServerError: E11000 duplicate key error collection: users index: email_1 dup key",
    diagnosis: "Duplicate Key Error. Attempted to create a record with a unique field (likely 'email') that already exists.",
    fix: "try {\n  await User.create(userData);\n} catch (err) {\n  if (err.code === 11000) return res.status(409).json({ message: 'Exists' });\n}",
    severity: "MEDIUM"
  },
  {
    name: "PortInUse",
    stackOverride: "Error: listen EADDRINUSE: address already in use :::5000",
    diagnosis: "Port Already In Use. Another process is already running on the specified port.",
    fix: "// Kill the process using the port\n// terminal: lsof -i :5000 | xargs kill -9",
    severity: "HIGH"
  },
  {
    name: "JwtExpired",
    stackOverride: "TokenExpiredError: jwt expired",
    diagnosis: "JWT Expired. The access token provided has passed its expiration time.",
    fix: "// Client: Refresh the token using the /refresh endpoint",
    severity: "LOW"
  }
];

export const seedCache = async () => {
  console.log('🌱 Starting Auto-Medic Supabase Sync...');

  if (!supabaseAdmin) {
    console.error('❌ Supabase Admin client not available. Skipping sync.');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const errorCase of commonErrors) {
    const normalized = normalizeTrace(errorCase.stackOverride);
    const signature = generateSignature(normalized);

    const { error } = await supabaseAdmin
      .from('error_cache')
      .upsert({
        signature,
        original_error: errorCase.stackOverride,
        diagnosis: errorCase.diagnosis,
        suggested_fix: errorCase.fix,
        severity: errorCase.severity || "MEDIUM",
        metadata: {
          normalized_stack: normalized,
          source: 'SEED_SCRIPT',
          timestamp: new Date().toISOString()
        }
      }, { onConflict: 'signature' });

    if (error) {
      console.error(`❌ Failed to upsert [${errorCase.name}]:`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n✅ Sync Complete!`);
  console.log(`   Upserted: ${successCount}`);
  console.log(`   Failed:   ${errorCount}`);
};
