# Package: `@servx/crypto` (`packages/crypto`)

**AES-256-CBC** helpers for encrypting connection configs and secrets at rest.

- **`resolveEncryptionKey()`** — reads `ENCRYPTION_KEY` (hex or padded string)
- **`encrypt` / `decrypt`** — produce/consume `iv` + `content` hex strings

**Entry:** `packages/crypto/index.ts`

Required for **`UserConnection.encryptedConfig`** and similar fields.
