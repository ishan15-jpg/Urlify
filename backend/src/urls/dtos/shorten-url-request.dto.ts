export interface ShortenUrlRequestDto {
    originalUrl: string;
    expiresAt?: number; 
}