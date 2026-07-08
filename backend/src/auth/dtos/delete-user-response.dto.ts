import { User } from '../auth.entity';

export interface DeleteUserResponseDto {
  id: string;
  deletedAt: string;
}

/**
 * Maps a User domain entity to a client-facing DeleteUserResponseDto.
 *
 * @param user - The User domain entity.
 * @returns A DeleteUserResponseDto containing the deletion timestamp.
 */
export function toDeleteUserResponseDto(user: User): DeleteUserResponseDto {
  return {
    id: user.id,
    deletedAt: user.updatedAt.toISOString(),
  };
}
