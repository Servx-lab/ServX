import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import Docker from 'dockerode';
import { executeAction, SecurityViolation } from '../src/services/executor';

jest.mock('dockerode');

describe('SRE Execution Engine', () => {
    let mockRestart: ReturnType<typeof jest.fn>;
    let mockGetContainer: ReturnType<typeof jest.fn>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockRestart = jest.fn();
        mockGetContainer = jest.fn().mockReturnValue({ restart: mockRestart });
        
        (Docker as unknown as jest.Mock).mockImplementation(() => ({
            getContainer: mockGetContainer
        }));
    });

    it('safely maps RESTART_CONTAINER payload to the correct mock docker container', async () => {
        const payload = {
            action: 'RESTART_CONTAINER',
            target: 'api-v1',
            containerId: 'abc-12345'
        };

        await executeAction(payload);

        // Verification: Ensure the exact container ID was targeted and restart was invoked
        expect(mockGetContainer).toHaveBeenCalledWith('abc-12345');
        expect(mockRestart).toHaveBeenCalledTimes(1);
    });

    it('throws a SecurityViolation and aborts immediately on unauthorized actions', async () => {
        const maliciousPayload = {
            action: 'DELETE_DATABASE', // Not in our whitelist
            target: 'main-db'
        };

        await expect(executeAction(maliciousPayload as any)).rejects.toThrow(SecurityViolation);
        
        // Critical Verification: Infrastructure was NEVER touched
        expect(mockGetContainer).not.toHaveBeenCalled();
        expect(mockRestart).not.toHaveBeenCalled();
    });
});
