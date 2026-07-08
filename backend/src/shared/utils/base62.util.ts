/**
 * Helper function for base62 encoding a number or BigInt to a 7 characters long base62 encoded string.
 *
 * @param id - The ID to encode.
 * @returns The 7-character base62 encoded string.
 */
export function encodeBase62(id: number | bigint): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let num = BigInt(id);
  if (num === 0n) {
    return '0'.repeat(7);
  }
  let encoded = '';
  while (num > 0n) {
    const remainder = num % 62n;
    encoded = alphabet[Number(remainder)] + encoded;
    num = num / 62n;
  }
  // Left pad with '0' to make it exactly 7 characters
  return encoded.padStart(7, '0');
}
