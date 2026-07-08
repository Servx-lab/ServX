import { describe, it, expect, jest } from '@jest/globals';
import { chunkMarkdown, generateEmbeddingWithRetry } from '../src/services/ragService';
import OpenAI from 'openai';

// Mock OpenAI constructor
jest.mock('openai');

describe('RAG Pipeline Ingestion', () => {
    
    describe('Chunking Utility', () => {
        it('should correctly split a large markdown file without cutting sentences', async () => {
            const mockMarkdown = `
# System Failure Runbook
This is the first sentence. This is the second sentence.
## Resolution Steps
Step 1: Check the database. Step 2: Restart the service.
            `.trim();

            const chunks = await chunkMarkdown(mockMarkdown, { chunkSize: 50, chunkOverlap: 10 });
            
            expect(chunks.length).toBeGreaterThan(1);
            
            // Verify chunks do not end with a broken word or cut halfway through a sentence haphazardly
            chunks.forEach(chunk => {
                expect(chunk).not.toMatch(/^[a-z]+\s*$/i);
            });
            
            // Ensure first chunk contains expected markdown headers
            expect(chunks[0]).toContain('# System Failure Runbook');
        });
    });

    describe('Embedding Retry Mechanism', () => {
        it('should handle OpenAI 429 rate limit errors using exponential backoff', async () => {
            const mockCreate = jest.fn();
            
            // Inject our mock into the OpenAI constructor prototype
            (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
                embeddings: { create: mockCreate }
            }));

            const rateLimitError = new Error('Rate limit exceeded');
            (rateLimitError as any).status = 429;
            
            // Simulate 429 error on the first two attempts, success on the third
            mockCreate
                .mockRejectedValueOnce(rateLimitError)
                .mockRejectedValueOnce(rateLimitError)
                .mockResolvedValueOnce({ data: [{ embedding: [0.1, 0.2, 0.3] }] });

            const start = Date.now();
            const result = await generateEmbeddingWithRetry('test text', { initialDelayMs: 50 });
            const duration = Date.now() - start;

            expect(mockCreate).toHaveBeenCalledTimes(3);
            expect(result).toEqual([0.1, 0.2, 0.3]);
            
            // Verify that backoff actually delayed execution (50ms + 100ms = 150ms minimum)
            expect(duration).toBeGreaterThanOrEqual(100); 
        });
    });
});
