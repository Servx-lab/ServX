import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

export interface EncryptedPayload {
	iv: string;
	content: string;
}

export const ENCRYPTION_KEY_RAW = () => process.env.ENCRYPTION_KEY;

// The raw env var is parsed into a Buffer on the first call and reused for
// every subsequent encrypt/decrypt operation. ENCRYPTION_KEY does not change
// during a process's lifetime, so re-parsing it on every single call (which
// happens on the hot path for every connection/config decrypt) is wasted work.
let cachedKey: { raw: string; buffer: Buffer } | null = null;

export function resolveEncryptionKey(): Buffer {
	const rawKey = ENCRYPTION_KEY_RAW();

	if (!rawKey) {
		throw new Error('ENCRYPTION_KEY is required');
	}

	if (cachedKey && cachedKey.raw === rawKey) {
		return cachedKey.buffer;
	}

	const trimmedKey = rawKey.trim();

	// Support legacy hex keys (64 hex chars => 32-byte key).
	const buffer = /^[0-9a-fA-F]{64}$/.test(trimmedKey)
		? Buffer.from(trimmedKey, 'hex')
		// Support legacy plain-string keys by normalizing to 32 bytes.
		: Buffer.from(trimmedKey.padEnd(KEY_LENGTH, '0').slice(0, KEY_LENGTH), 'utf8');

	cachedKey = { raw: rawKey, buffer };
	return buffer;
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

export function encryptWithIv(text: string, ivHex: string): EncryptedPayload {
	if (ivHex.length !== IV_LENGTH * 2 || !/^[0-9a-fA-F]+$/.test(ivHex)) {
		throw new Error(`Invalid IV: expected ${IV_LENGTH * 2} hex characters`);
	}
	const iv = Buffer.from(ivHex, 'hex');
	const cipher = crypto.createCipheriv(ALGORITHM, resolveEncryptionKey(), iv);

	const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

	return {
		iv: ivHex,
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
