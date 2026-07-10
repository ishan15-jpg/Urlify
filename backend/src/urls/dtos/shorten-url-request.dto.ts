export interface ShortenUrlRequestDto {
    originalUrl: string;
    expirationTime?: number; 
}