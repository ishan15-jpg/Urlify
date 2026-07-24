import type { RegisterPayload, LoginPayload, VerifyEmailPayload } from '../../../types';
import type { RegisterResponseData, LoginResponseData, VerifyEmailResponseData, RefreshResponseData } from '../../../types/authResponses';

export interface IAuthService {
    register(payload: RegisterPayload, confirmPassword?: string): Promise<RegisterResponseData>;
    login(payload: LoginPayload): Promise<LoginResponseData>;
    logout(): Promise<void>;
    verifyEmail(data: VerifyEmailPayload): Promise<VerifyEmailResponseData>;
    // sendEmailVerificationLink(data: EmailVerificationLinkPayload): Promise<EmailVerificationLinkResponseData>;
    // forgotPassword(data: ForgotPasswordPayload): Promise<void>;
    // resetPassword(data: ResetPasswordPayload): Promise<void>;
    refreshToken(): Promise<RefreshResponseData>;
};