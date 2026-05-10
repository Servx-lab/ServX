/**
 * ErrorAnalyzerService
 * 
 * Handles error interception, normalization, and intelligent diagnosis using LLMs.
 * Uses Supabase as a persistent caching layer to optimize token usage.
 */
const crypto = require('crypto');
const OpenAI = require('openai');
const { supabaseAdmin } = require('../src/utils/supabaseAdmin');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class ErrorAnalyzerService {
  /**
   * Normalizes a stack trace to ignore environment-specific data.
   * Strips: Absolute paths, Line numbers, Timestamps, Memory addresses, and UUIDs.
   */
  normalizeTrace(stack) {
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

  /**
   * Generates a stable SHA-256 signature for the normalized error.
   */
  generateSignature(normalizedStack) {
    return crypto.createHash('sha256').update(normalizedStack).digest('hex');
  }

  /**
   * Real LLM Analysis using OpenAI gpt-4o.
   * Enforces JSON output for automated processing.
   */
  async fetchAiDiagnosis(errorMessage, normalizedStack) {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[Auto-Medic] OPENAI_API_KEY is missing. Using fallback.');
      return this.getFallbackAnalysis();
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an Expert DevOps & Full-Stack Debugging Assistant. 
            Your goal is to analyze server errors and provide a precise diagnosis and remediation path.
            
            You MUST return a valid JSON object with exactly these keys:
            - "diagnosis": A concise 1-2 sentence explanation of why the error happened.
            - "suggestedFix": A specific code snippet or terminal command to fix the issue.
            - "severity": One of ["LOW", "MEDIUM", "HIGH", "CRITICAL"].`
          },
          {
            role: "user",
            content: `Analyze this error:
            Error Message: ${errorMessage}
            
            Normalized Stack Trace:
            ${normalizedStack}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const content = JSON.parse(response.choices[0].message.content);
      return {
        diagnosis: content.diagnosis,
        suggestedFix: content.suggestedFix,
        severity: content.severity || 'MEDIUM',
      };

    } catch (error) {
      console.error('[Auto-Medic] LLM Analysis Failed:', error.message);
      return this.getFallbackAnalysis();
    }
  }

  /**
   * Fallback object if the LLM provider is down or configuration is missing.
   */
  getFallbackAnalysis() {
    return {
      diagnosis: "Automated analysis unavailable. Error signature captured.",
      suggestedFix: "// Please review logs manually for this specific signature.",
      severity: "UNKNOWN"
    };
  }

  /**
   * Main entry point: Analyzes an error object, checking Supabase cache first.
   */
  async analyzeError(errorObject) {
    // Basic verification of dependencies
    if (!supabaseAdmin) {
      console.error('[Auto-Medic] Supabase client is uninitialized.');
      return this.getFallbackAnalysis();
    }

    const normalizedStack = this.normalizeTrace(errorObject.stack || errorObject.message);
    const signature = this.generateSignature(normalizedStack);

    try {
      // 1. Cache Lookup (Supabase)
      const { data: cachedError, error: fetchError } = await supabaseAdmin
        .from('error_cache')
        .select('*')
        .eq('signature', signature)
        .single();

      if (cachedError && !fetchError) {
        console.log(`[Auto-Medic] Cache HIT: ${signature.substring(0, 8)}`);
        return {
          diagnosis: cachedError.diagnosis,
          suggestedFix: cachedError.suggested_fix,
          severity: cachedError.severity,
          cached: true,
          signature
        };
      }

      // 2. Cache MISS -> Call Real AI
      console.log(`[Auto-Medic] Cache MISS: ${signature.substring(0, 8)}. Calling LLM...`);
      const aiResult = await this.fetchAiDiagnosis(errorObject.message, normalizedStack);

      // 3. Persist to Supabase
      const newEntry = {
        signature,
        original_error: errorObject.message,
        diagnosis: aiResult.diagnosis,
        suggested_fix: aiResult.suggestedFix,
        severity: aiResult.severity,
        metadata: {
          normalized_stack: normalizedStack,
          timestamp: new Date().toISOString()
        }
      };

      const { error: insertError } = await supabaseAdmin
        .from('error_cache')
        .insert([newEntry]);

      if (insertError) {
        console.error('[Auto-Medic] Failed to cache error in Supabase:', insertError.message);
      }

      return {
        ...aiResult,
        cached: false,
        signature
      };

    } catch (err) {
      console.error('[Auto-Medic] Service Logic Failure:', err.message);
      return this.getFallbackAnalysis();
    }
  }
}

module.exports = new ErrorAnalyzerService();
