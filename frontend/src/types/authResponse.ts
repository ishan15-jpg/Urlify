// --- Specific Data Payloads for /auth Endpoints ---

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isEmailVerified: boolean;
}

export interface LoginResponseData {
  user: User;
  accessToken: string;
  expiresIn: number;
}

export interface RegisterResponseData {
  user: User;
}

export interface VerifyEmailResponseData {
  email: string;
  isEmailVerified: boolean;
}

export interface EmailVerificationLinkResponseData {
  email: string;
  expiresIn: number;
}

export interface VerifyEmailResponseData {
  email: string;
  isEmailVerified: boolean;
}

export interface RefreshResponseData {
  accessToken: string;
  expiresIn: number;
}

