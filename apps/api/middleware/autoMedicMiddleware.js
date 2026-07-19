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

    const parsedErrorCode = parseInt(err.code || err.statusCode || err.status || err.response?.status || 500, 10);
    const errorCode = isNaN(parsedErrorCode) ? 500 : parsedErrorCode;

    // 2. Structure the Incident Report
    const incidentReport = {
      id: `INC-${Date.now()}`,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      error_message: err.message,
      error_stack: err.stack,
      error_code: errorCode,
      diagnosis: analysis.diagnosis,
      suggested_fix: analysis.suggestedFix,
      severity: analysis.severity,
      cached: analysis.cached,
      user_id: req.user?.uid || req.user?.id || null,
      connection_id: req.headers['x-connection-id'] || null
    };

    // 3. Save to Supabase (Replacing fs.writeFile)
    if (supabaseAdmin) {
      const { error: dbError } = await supabaseAdmin
        .from('incidents')
        .insert([incidentReport]);
        
      if (dbError) {
        console.error('[Auto-Medic] Failed to log incident:', dbError.message);
      } else {
        // --- ENFORCE 20-RECORD LIMIT (FIFO) ---
        // Fetch IDs of records beyond the most recent 20
        const { data: excess } = await supabaseAdmin
          .from('incidents')
          .select('id')
          .neq('method', 'DEPLOY')
          .order('timestamp', { ascending: false })
          .range(20, 50); // Identify records starting from the 21st

        if (excess && excess.length > 0) {
          const idsToDelete = excess.map(e => e.id);
          await supabaseAdmin.from('incidents').delete().in('id', idsToDelete);
          console.log(`[Auto-Medic] Pruned ${idsToDelete.length} old incident records.`);
        }
      }
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
