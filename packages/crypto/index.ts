import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

export interface EncryptedPayload {
	iv: string;
	content: string;
}

export const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY;

export function resolveEncryptionKey(): Buffer {
	const rawKey = ENCRYPTION_KEY_RAW;

	if (!rawKey) {
		throw new Error('ENCRYPTION_KEY is required');
	}

	const trimmedKey = rawKey.trim();

	// Support legacy hex keys (64 hex chars => 32-byte key).
	if (/^[0-9a-fA-F]{64}$/.test(trimmedKey)) {
		return Buffer.from(trimmedKey, 'hex');
	}

	// Support legacy plain-string keys by normalizing to 32 bytes.
	return Buffer.from(trimmedKey.padEnd(KEY_LENGTH, '0').slice(0, KEY_LENGTH), 'utf8');
}

export function encrypt(text: string): EncryptedPayload {
	const iv = crypto.randomBytes(IV_LENGTH);
	const cipher = crypto.createCipheriv(ALGORITHM, resolveEncryptionKey(), iv);

	const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

	return {
		iv: iv.toString('hex'),
		content: encrypted.toString('hex'),
	};
}

export function decrypt(payload: EncryptedPayload): string {
	const iv = Buffer.from(payload.iv, 'hex');
	const encryptedText = Buffer.from(payload.content, 'hex');
	const decipher = crypto.createDecipheriv(ALGORITHM, resolveEncryptionKey(), iv);

	const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);

	return decrypted.toString('utf8');
}
