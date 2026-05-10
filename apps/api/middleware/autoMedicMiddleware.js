const errorAnalyzer = require('../services/errorAnalyzer.service.js');
const { supabaseAdmin } = require('../src/utils/supabaseAdmin');

/**
 * Express Error Handling Middleware for the Auto-Medic Pipeline.
 * [PHASE 1 & 2] Migrated to Supabase and Integrated Real LLM logic.
 */
const autoMedicMiddleware = async (err, req, res, next) => {
  console.error('[Auto-Medic] Intercepting Error:', err.message);

  try {
    // 1. Analyze the error (Check Cache or Call AI)
    const analysis = await errorAnalyzer.analyzeError(err);

    // 2. Structure the Incident Report
    const incidentReport = {
      id: `INC-${Date.now()}`,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      error_message: err.message,
      error_stack: err.stack,
      error_code: err.code || 500,
      diagnosis: analysis.diagnosis,
      suggested_fix: analysis.suggestedFix,
      severity: analysis.severity,
      cached: analysis.cached
    };

    // 3. Save to Supabase (Replacing fs.writeFile)
    if (supabaseAdmin) {
      const { error: dbError } = await supabaseAdmin
        .from('incidents')
        .insert([incidentReport]);
        
      if (dbError) console.error('[Auto-Medic] Failed to log incident:', dbError.message);
    }
    
    // 4. Send Response
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({
        success: false,
        message: 'Internal Server Error (Auto-Medic Analyzed)',
        incidentId: incidentReport.id,
        analysis: {
           diagnosis: analysis.diagnosis,
           fix: analysis.suggestedFix,
           severity: analysis.severity,
           cached: analysis.cached
        }
      });
    }

    next(err);

  } catch (analyzerError) {
    console.error('Auto-Medic Pipeline Failure:', analyzerError);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
  }
};

module.exports = autoMedicMiddleware;
