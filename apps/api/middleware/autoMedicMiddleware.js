const fs = require('fs').promises;
const path = require('path');
const errorAnalyzer = require('../services/errorAnalyzer.service.js');

// Path to store the latest incident for the frontend to poll
const INCIDENT_LOG_PATH = path.join(__dirname, '../data/latest-incident.json');

/**
 * Express Error Handling Middleware for the Auto-Medic Pipeline.
 * Catches unhandled errors, analyzes them with AI, and broadcasts the solution.
 */
const autoMedicMiddleware = async (err, req, res, next) => {
  console.error('[Auto-Medic] Intercepting Error:', err.message);

  // 1. Analyze the error (Check Cache or Call AI)
  try {
    const analysis = await errorAnalyzer.analyzeError(err);

    // 2. Structure the Incident Report
    const incidentReport = {
      id: `INC-${Date.now()}`,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      error: {
        message: err.message,
        stack: err.stack,
        code: err.code || 500
      },
      analysis: {
        diagnosis: analysis.diagnosis,
        fix: analysis.suggestedFix,
        severity: analysis.severity,
        cached: analysis.cached
      }
    };

    // 3. Save to "Database" (JSON file) for the Frontend to read
    // In a real app, this would be: await Incident.create(incidentReport);
    // or: io.emit('incident', incidentReport);
    await fs.writeFile(INCIDENT_LOG_PATH, JSON.stringify(incidentReport, null, 2));
    
    // 4. Send Response
    // If we're in development or it's an API call, return the analysis
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({
        success: false,
        message: 'Internal Server Error (Auto-Medic Analyzed)',
        incidentId: incidentReport.id,
        analysis: incidentReport.analysis // Exposed for demo purposes
      });
    }

    // Pass to default handler if not JSON request (or handle 500 page)
    next(err);

  } catch (analyzerError) {
    console.error('Auto-Medic Failed:', analyzerError);
    // Fallback to standard error response
    res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error',
      error: err.message 
    });
  }
};

module.exports = autoMedicMiddleware;
