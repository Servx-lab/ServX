import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a plaintext token using AES-256-GCM.
 * Requires ENCRYPTION_KEY to be set in the environment (32 bytes hex).
 */
export function encryptToken(text: string): { iv: string; encryptedData: string; authTag: string } {
    const keyString = process.env.ENCRYPTION_KEY;
    if (!keyString) {
        throw new Error('ENCRYPTION_KEY environment variable is not set.');
    }

    // Ensure key is exactly 32 bytes (256 bits)
    const key = Buffer.from(keyString, 'hex');
    if (key.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be a 32-byte (64 character) hex string.');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');

    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        authTag,
    };
}

/**
 * Decrypts a cipher payload back to plaintext.
 */
export function decryptToken(hash: { iv: string; encryptedData: string; authTag: string }): string {
    const keyString = process.env.ENCRYPTION_KEY;
    if (!keyString) {
        throw new Error('ENCRYPTION_KEY environment variable is not set.');
    }

    const key = Buffer.from(keyString, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(hash.iv, 'hex'));
    
    decipher.setAuthTag(Buffer.from(hash.authTag, 'hex'));

    let decrypted = decipher.update(hash.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
