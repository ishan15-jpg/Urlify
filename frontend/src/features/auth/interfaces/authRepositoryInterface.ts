import type { RegisterPayload, LoginPayload, EmailVerificationLinkPayload, VerifyEmailPayload, ForgotPasswordPayload, ResetPasswordPayload } from '../../../types';

export interface IAuthRepository {
  login: (data: LoginPayload) => Promise<any>;

  logout: () => Promise<any>;

  register: (data: RegisterPayload) => Promise<any>;

  sendEmailVerificationLink: (data: EmailVerificationLinkPayload) => Promise<any>;

  verifyEmail: (data: VerifyEmailPayload) => Promise<any>;

  forgotPassword: (data: ForgotPasswordPayload) => Promise<any>;

  resetPassword: (data: ResetPasswordPayload) => Promise<any>;

  refreshToken: () => Promise<any>;
};
