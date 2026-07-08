import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const STREAM_URL = 'http://localhost:3001/api/stream';
const TRIGGER_URL = 'http://localhost:3001/api/trigger';

console.log('🧪 Starting Auto-Medic Integration Test...');

// 1. Connect to /api/stream
const req = http.request(STREAM_URL, { method: 'GET' }, (res) => {
    if (res.statusCode !== 200) {
        console.error(`❌ Failed to connect to stream. Status Code: ${res.statusCode}`);
        process.exit(1);
    }
    
    console.log('📡 Connected to /api/stream (SSE). Listening for events...');

    res.setEncoding('utf8');
    let buffer = '';

    res.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        
        // Keep the last partial line in the buffer
        buffer = lines.pop();

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                if (!dataStr) continue;

                try {
                    const event = JSON.parse(dataStr);
                    
                    if (event.type === 'START') {
                        console.log('🚀 [START] Auto-Medic pipeline initiated.');
                    } else if (event.type === 'UPDATE') {
                        console.log(`🟢 Step ${event.step || ''}: ${event.message || JSON.stringify(event)}`);
                    } else if (event.type === 'COMPLETE') {
                        console.log('✅ [COMPLETE] Pipeline sequence finished successfully!');
                        console.log('💣 Initiating critical self-destruct sequence...');
                        
                        try {
                            fs.unlinkSync(__filename);
                            console.log('💥 Script successfully deleted itself. All tests passed!');
                            process.exit(0);
                        } catch (err) {
                            console.error('❌ Failed to self-destruct:', err.message);
                            process.exit(1);
                        }
                    } else {
                        console.log(`🔵 [INFO]: ${JSON.stringify(event)}`);
                    }
                } catch (e) {
                    console.error('⚠️ Failed to parse SSE JSON chunk:', dataStr);
                }
            }
        }
    });
    
    res.on('end', () => {
        console.log('🔌 Stream disconnected.');
    });
});

req.on('error', (e) => {
    console.error(`❌ Stream connection error: ${e.message}`);
});

req.end();

// 2. Wait 1.5 seconds, then POST to /api/trigger
setTimeout(() => {
    console.log('⚡ Sending POST request to /api/trigger...');
    const triggerReq = http.request(TRIGGER_URL, { method: 'POST' }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log(`🎯 Trigger successful (${res.statusCode}). Waiting for SSE updates...`);
            } else {
                console.error(`❌ Trigger failed with status ${res.statusCode}: ${data}`);
            }
        });
    });
    
    triggerReq.on('error', (e) => {
        console.error(`❌ Trigger request failed: ${e.message}`);
    });
    
    triggerReq.end();
}, 1500);
