/**
 * Edit-code utilities (Section 4 of SPEC.md).
 *
 * Random codes are generated with the Web Crypto CSPRNG in an unambiguous
 * alphabet (no O/0, I/1) and formatted as XXXX-XXXX-XXXX. They are shown to
 * the user exactly once and stored server-side only as a bcrypt hash.
 */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** Crypto-provided random integers below `max` without modulo bias. */
function randomIntsBelow(max: number, count: number): Uint32Array {
  const result = new Uint32Array(count)
  const rejectionLimit = Math.floor(0x1_0000_0000 / max) * max
  const buffer = new Uint32Array(count)
  let filled = 0
  while (filled < count) {
    const chunk = new Uint32Array(count - filled)
    crypto.getRandomValues(chunk)
    for (let i = 0; i < chunk.length; i += 1) {
      if (chunk[i] < rejectionLimit) {
        buffer[filled] = chunk[i]
        filled += 1
      }
    }
  }
  for (let i = 0; i < count; i += 1) {
    result[i] = buffer[i] % max
  }
  return result
}

export function generateRandomEditCode(): string {
  const indices = randomIntsBelow(CODE_ALPHABET.length, 12)
  const chars = Array.from(indices, (i) => CODE_ALPHABET[i])
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars
    .slice(8, 12)
    .join("")}`
}

/** Custom codes: 6–64 characters, no whitespace. */
export function isValidCustomEditCode(code: string): boolean {
  return code.length >= 6 && code.length <= 64 && !/\s/.test(code)
}
