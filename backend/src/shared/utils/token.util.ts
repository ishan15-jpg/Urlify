import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generates a signed JWT access token.
 * 
 * @param payload - The data to embed in the token.
 * @returns The signed JWT token string.
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

/**
 * Generates a signed JWT refresh token.
 * 
 * @param payload - The data to embed in the token.
 * @returns The signed JWT token string.
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

/**
 * Verifies a signed JWT access token.
 * 
 * @param token - The JWT token string to verify.
 * @returns The decoded TokenPayload.
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

