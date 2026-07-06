/**
 * Domain entity representing a user row as returned from the database.
 * This is an internal type — only export it via the module's index.ts if other modules need it.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  isEmailVerified: boolean;
  isBlacklisted: boolean;
  isDeleted: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailVerificationToken {
  id: string;
  userId: string;
  tokenHash: string;
  isRevoked: boolean;
  expiresAt: Date;
  isExpired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

