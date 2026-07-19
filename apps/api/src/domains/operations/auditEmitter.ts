import { EventEmitter } from 'events';

class AuditEmitter extends EventEmitter {
  log(userEmail: string, actionType: 'security' | 'task' | 'maintenance' | 'auth' | 'incident', message: string) {
    const payload = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      user: userEmail,
      type: actionType,
      message,
    };
    this.emit('log', payload);
  }
}

export const auditEmitter = new AuditEmitter();
