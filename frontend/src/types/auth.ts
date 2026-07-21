export interface LoginPayload {
  email?: string;
  password?: string;
}

export interface RegisterPayload {
  name?: string;
  email?: string;
  password?: string;
} 

export interface EmailVerificationLinkPayload {
  email?: string;
}

export interface VerifyEmailPayload {
  token?: string;
}

export interface ForgotPasswordPayload {
  email?: string;
}

export interface ResetPasswordPayload {
  token?: string;
  newPassword?: string;
}
