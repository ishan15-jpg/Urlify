import { User } from '../../auth/auth.entity';

export interface UserProfileResponseDto {
  id: string;
  name: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export function toUserProfileDto(user: User): UserProfileResponseDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'user',
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}
