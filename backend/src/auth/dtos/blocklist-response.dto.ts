import { User } from '../auth.entity';

export interface BlocklistResponseDto {
  id: string;
  isBlocklisted: boolean;
  blocklistedAt: string;
}

/**
 * Maps a User domain entity to a safe, client-facing BlocklistResponseDto.
 *
 * @param user - The User domain entity.
 * @returns A BlocklistResponseDto with updated blocklist details.
 */
export function toBlocklistResponseDto(user: User): BlocklistResponseDto {
  return {
    id: user.id,
    isBlocklisted: user.isBlacklisted,
    blocklistedAt: user.updatedAt.toISOString(),
  };
}
