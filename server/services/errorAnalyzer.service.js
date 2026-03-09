const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Path to our local JSON cache (simulating a DB)
const CACHE_FILE_PATH = path.join(__dirname, '../data/errorCache.json');

// Ensure the data directory exists
const ensureCacheDir = async () => {
  const dir = path.dirname(CACHE_FILE_PATH);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

/**
 * Service to intercept, analyze, and cache server errors using AI (simulated).
 * This prevents hitting rate limits by returning cached solutions for known error signatures.
 */
class ErrorAnalyzerService {
  constructor() {
    this.cache = {};
    this.isInitialized = false;
  }

  /**
   * Initialize the service by loading the cache from disk.
   */
  async init() {
    if (this.isInitialized) return;
    
    await ensureCacheDir();
    try {
      const data = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
      this.cache = JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is invalid, start with empty cache
      this.cache = {};
    }
    this.isInitialized = true;
  }

  /**
   * Saves the current cache to disk.
   */
  async persistCache() {
    try {
      await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('Failed to persist error cache:', error);
    }
  }

  /**
   * Normalizes a stack trace to ignore timestamps, specific IDs, or memory addresses.
   * This ensures that "same" errors produce the same hash.
   * @param {string} stack - The raw stack trace
   * @returns {string} - The normalized stack string
   */
  normalizeTrace(stack) {
    if (!stack) return '';
    return stack
      // Remove timestamps (e.g., "2023-10-27T10:00:00.000Z")
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '')
      // Remove memory addresses (e.g., "0x000000000")
      .replace(/0x[a-fA-F0-9]+/g, '0xMEM')
      // Remove specific user IDs or UUIDs in error messages if they appear
      // (Simplified regex for UUID)
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<UUID>')
      // Standardize file paths (optional, depends on deployment)
      .trim();
  }

  /**
   * Generates a unique SHA-256 signature for the error.
   * @param {string} normalizedStack 
   * @returns {string} - The hex hash
   */
  generateSignature(normalizedStack) {
    return crypto
      .createHash('sha256')
      .update(normalizedStack)
      .digest('hex');
  }

  /**
   * Mock AI Service call.
   * In production, this would call OpenAI/Anthropic API.
   */
  async fetchAiDiagnosis(errorMessage, normalizedStack) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simple keyword matching to simulate "Intelligence"
    let diagnosis = "Unknown system error. Please check logs.";
    let fix = "// Check server logs for details";

    if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("ECONNREFUSED")) {
      diagnosis = "Database Connection Failure. The server cannot reach the MongoDB instance.";
      fix = `// Check your .env file
// Ensure MONGODB_URI is correct and the database is running
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
});`;
    } else if (errorMessage.includes("jwt expired")) {
      diagnosis = "Authentication Token Expired. The user's session is no longer valid.";
      fix = `// Client-side: Redirect to login
// Server-side: Refresh token flow
if (err.name === 'TokenExpiredError') {
  return res.status(401).json({ message: 'Session expired', code: 'TOKEN_EXPIRED' });
}`;
    } else if (errorMessage.includes("Cannot read properties of undefined") || errorMessage.includes("null")) {
      diagnosis = "Null Pointer Exception. Attempted to access a property on a null/undefined object.";
      fix = `// Add optional chaining or existence check
if (!user || !user.profile) {
  throw new Error('User profile not found');
}
const email = user.profile.email;`;
    }

    return {
      diagnosis,
      suggestedFix: fix,
      severity: 'HIGH',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Main entry point. Analyzes an error object, checking cache first.
   * @param {Error} errorObject - The original error thrown
   * @returns {Promise<Object>} - The analysis result
   */
  async analyzeError(errorObject) {
    if (!this.isInitialized) await this.init();

    const normalizedStack = this.normalizeTrace(errorObject.stack || errorObject.message);
    const signature = this.generateSignature(normalizedStack);

    // 1. Cache HIT
    if (this.cache[signature]) {
      console.log(`[Auto-Medic] Cache HIT for error: ${signature.substring(0, 8)}`);
      return {
        ...this.cache[signature],
        cached: true,
        signature
      };
    }

    // 2. Cache MISS (Call AI)
    console.log(`[Auto-Medic] Cache MISS for error: ${signature.substring(0, 8)}. Calling AI...`);
    const aiResult = await this.fetchAiDiagnosis(errorObject.message, normalizedStack);

    // 3. Update Cache
    const analysis = {
      originalError: errorObject.message,
      check: this.cache[signature], // should be undefined
      ...aiResult
    };

    this.cache[signature] = analysis;
    await this.persistCache();

    return {
      ...analysis,
      cached: false,
      signature
    };
  }
}

// Export singleton instance
module.exports = new ErrorAnalyzerService();
