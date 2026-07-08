export interface Url {
  id: string; // Postgres BIGINT is parsed as string in node-pg
  userId: string | null;
  originalUrl: string;
  shortUrl: string;
  isDeleted: boolean;
  isExpired: boolean;
  clickCount: number;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
