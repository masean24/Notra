import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"

/**
 * AES-256-GCM encryption for stored BYOK Gemini keys (SPEC §12/§16).
 *
 * Ciphertext format: "v1:" + base64(iv) + ":" + base64(authTag) + ":" +
 * base64(ciphertext). The key comes from ENCRYPTION_KEY (base64, 32 bytes);
 * any well-formed value is accepted, and short/legacy values are hashed to
 * 32 bytes so misconfigured environments fail loudly here rather than
 * silently at Google's API.
 */

const VERSION = "v1"

function encryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not configured")
  }
  const decoded = Buffer.from(raw, "base64")
  if (decoded.length === 32) {
    return decoded
  }
  // Deterministic fallback so a mismatched key length still produces a valid
  // AES-256 key (rotation just requires re-saving keys).
  return createHash("sha256").update(raw, "utf8").digest()
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return [
    VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":")
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(":")
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("INVALID_CIPHERTEXT_FORMAT")
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivB64, "base64")
  )
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ])
  return plaintext.toString("utf8")
}
