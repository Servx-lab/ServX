import { Request, Response } from 'express';
import { EventEmitter } from 'events';

// Singleton Event Emitter for system monitoring events
export const SystemMonitor = new EventEmitter();

/**
 * Controller to handle Server-Sent Events (SSE) connections.
 * Streams system monitoring events directly to connected clients.
 */
export const streamController = (req: Request, res: Response) => {
    // 1. Establish strict SSE Headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    // 2. Define the listener function for internal events
    const faultListener = (payload: any) => {
        // SSE format requires data to be prefixed with 'data: ' and end with two newlines
        const eventData = JSON.stringify({ type: 'infrastructure_fault', ...payload });
        res.write(`data: ${eventData}\n\n`);
    };

    // 3. Attach the listener to our singleton monitor
    SystemMonitor.on('infrastructure_fault', faultListener);

    // 4. Memory Leak Prevention: Clean up listener when the client disconnects
    req.on('close', () => {
        SystemMonitor.removeListener('infrastructure_fault', faultListener);
        res.end();
    });
};
