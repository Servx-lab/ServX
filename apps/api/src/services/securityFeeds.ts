import { EventEmitter } from 'events';

/**
 * Shared event emitter for real-time security feeds.
 * Webhooks emit to this; SSE streams subscribe to it.
 */
class FeedEmitter extends EventEmitter {}

export const feedEmitter = new FeedEmitter();

/**
 * Service to analyze infrastructure events and detect rogue behavior.
 */
export const anomalyDetector = {
  analyzeEvent(payload: any) {
    let severity: 'normal' | 'anomaly' | 'critical' = 'normal';
    let message = '';

    // Example push event analysis
    if (payload.pusher) {
      const isForcePush = payload.forced === true;
      const isLateNight = new Date().getHours() < 6 || new Date().getHours() > 22;

      if (isForcePush) {
        severity = 'anomaly';
        message = `git force-push to ${payload.repository.full_name} (${payload.pusher.name}) - Potential history overwrite.`;
      } else if (isLateNight) {
        severity = 'anomaly';
        message = `git: push to ${payload.repository.full_name} (${payload.pusher.name}) - Out of standard working hours.`;
      } else {
        message = `git: push to ${payload.repository.full_name} (${payload.pusher.name})`;
      }
    }

    // Example mission critical action (mocked logic for manual drops)
    if (payload.event_type === 'db_drop') {
      severity = 'critical';
      message = `CRITICAL: Massive document drop initiated on ${payload.target}.`;
    }

    return { severity, message };
  }
};
