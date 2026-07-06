import { User } from '../auth.entity';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
}

export interface LoginResponseDto {
  user: UserDto;
  accessToken: string;
}

/**
 * Maps a User domain entity to a safe, client-facing UserDto.
 *
 * @param user - The user entity.
 * @returns A user response DTO with no sensitive fields.
 */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isEmailVerified: user.isEmailVerified,
  };
}
