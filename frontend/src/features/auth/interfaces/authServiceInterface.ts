import type { RegisterPayload, LoginPayload, VerifyEmailPayload, EmailVerificationLinkPayload, ForgotPasswordPayload, ResetPasswordPayload, UpdatePasswordPayload } from '../../../types';
import type { RegisterResponseData, LoginResponseData, VerifyEmailResponseData, RefreshResponseData, EmailVerificationLinkResponseData } from '../../../types/authResponse';

export interface IAuthService {
    register(payload: RegisterPayload, confirmPassword?: string): Promise<RegisterResponseData>;
    login(payload: LoginPayload): Promise<LoginResponseData>;
    logout(): Promise<void>;
    verifyEmail(data: VerifyEmailPayload): Promise<VerifyEmailResponseData>;
    sendEmailVerificationLink(data: EmailVerificationLinkPayload): Promise<EmailVerificationLinkResponseData>;
    forgotPassword(data: ForgotPasswordPayload): Promise<void>;
    resetPassword(data: ResetPasswordPayload): Promise<void>;
    refreshToken(): Promise<RefreshResponseData>;
    updatePassword(payload: UpdatePasswordPayload): Promise<void>;
};