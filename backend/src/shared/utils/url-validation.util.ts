/**
 * Helper function to validate if a string is a valid HTTP/HTTPS URL.
 *
 * @param urlStr - The URL string to validate.
 * @returns True if valid, false otherwise.
 */
export function isValidUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
