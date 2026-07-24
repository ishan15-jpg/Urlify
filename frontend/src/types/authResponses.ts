import { type ApiResponse } from './apiResponse';

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

// --- Full Response Types ---


// For endpoints like forgot-password, reset-password, verify-email which typically don't return data, just a message
export type StandardAuthResponse = ApiResponse<void>;
