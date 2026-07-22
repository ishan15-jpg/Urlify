export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface UserProfileResponse {
  user: User;
}
