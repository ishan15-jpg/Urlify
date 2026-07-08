import { User } from '../auth.entity';

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  isBlocklisted: boolean;
  createdAt: string;
}

export interface AdminUsersResponseDto {
  users: AdminUserDto[];
  pagination: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    limit: number;
  };
}

/**
 * Maps a User domain entity to a client-facing AdminUserDto.
 * Translates the internal role to uppercase (e.g. "USER", "ADMIN") to align with API specs.
 *
 * @param user - The User domain entity.
 * @returns AdminUserDto mapping.
 */
export function toAdminUserDto(user: User): AdminUserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: (user.role || 'user').toUpperCase(),
    isEmailVerified: user.isEmailVerified,
    isBlocklisted: user.isBlacklisted,
    createdAt: user.createdAt.toISOString(),
  };
}
