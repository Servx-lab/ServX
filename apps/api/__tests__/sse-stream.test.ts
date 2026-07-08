import request from 'supertest';
import express from 'express';
import { streamController, SystemMonitor } from '../src/controllers/streamController';

const app = express();
app.get('/api/v1/medic/stream', streamController);

describe('SSE Stream Endpoint: /api/v1/medic/stream', () => {
    
    it('returns a 200 OK with strict SSE headers', async () => {
        const response = await request(app).get('/api/v1/medic/stream');
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/event-stream');
        expect(response.headers['cache-control']).toContain('no-cache');
        expect(response.headers['connection']).toContain('keep-alive');
    });

    it('keeps connection alive and pushes formatted stream data on infrastructure_fault', (done) => {
        const req = request(app).get('/api/v1/medic/stream');
        
        req.expect(200).buffer(false).end((err, res) => {
            if (err) return done(err);

            res.on('data', (chunk) => {
                const dataStr = chunk.toString();
                
                if (dataStr.includes('infrastructure_fault')) {
                    expect(dataStr).toMatch(/^data: \{.*\}\n\n$/);
                    expect(dataStr).toContain('"message":"Simulated Memory Heap Spike"');
                    done();
                }
            });

            setTimeout(() => {
                SystemMonitor.emit('infrastructure_fault', { 
                    level: 'critical', 
                    message: 'Simulated Memory Heap Spike' 
                });
            }, 50);
        });
    });
});
