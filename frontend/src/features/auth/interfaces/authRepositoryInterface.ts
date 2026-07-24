import type { RegisterPayload, LoginPayload, EmailVerificationLinkPayload, VerifyEmailPayload, ForgotPasswordPayload, ResetPasswordPayload } from '../../../types';
import type { ApiResponse } from '../../../types/apiResponse';
import type { EmailVerificationLinkResponseData, LoginResponseData, RefreshResponseData, RegisterResponseData, VerifyEmailResponseData } from '../../../types/authResponses';

export interface IAuthRepository {
  login: (data: LoginPayload) => Promise<ApiResponse<LoginResponseData>>;

  logout: () => Promise<ApiResponse<null>>;

  register: (data: RegisterPayload) => Promise<ApiResponse<RegisterResponseData>>;

  sendEmailVerificationLink: (data: EmailVerificationLinkPayload) => Promise<ApiResponse<EmailVerificationLinkResponseData>>;

  verifyEmail: (data: VerifyEmailPayload) => Promise<ApiResponse<VerifyEmailResponseData>>;

  forgotPassword: (data: ForgotPasswordPayload) => Promise<ApiResponse<null>>;

  resetPassword: (data: ResetPasswordPayload) => Promise<ApiResponse<null>>;

  refreshToken: () => Promise<ApiResponse<RefreshResponseData>>;
};
