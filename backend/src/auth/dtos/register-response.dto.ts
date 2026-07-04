import { User } from '../auth.entity';

/**
 * DTO for the POST /auth/register success response.
 * Strips sensitive fields (passwordHash) before sending to the client.
 */
export interface RegisterResponseDto {
  id: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
}

/**
 * Maps a User domain entity to a safe, client-facing RegisterResponseDto.
 *
 * @param user - The newly created user entity.
 * @returns A response DTO with no sensitive fields.
 */
export function toRegisterResponseDto(user: User): RegisterResponseDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isEmailVerified: user.isEmailVerified,
  };
}
