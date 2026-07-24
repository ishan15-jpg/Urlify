import type { RegisterPayload, LoginPayload } from '../../../types';
import type { VerifyEmailResponseData } from '../../../types/authResponses';

export interface IAuthService {
    register(payload: RegisterPayload, confirmPassword?: string): Promise<any>;
    login(payload: LoginPayload): Promise<any>;
    logout(): Promise<any>;
    verifyEmail(token: string): Promise<VerifyEmailResponseData>;
    refreshToken(): Promise<any>;
};