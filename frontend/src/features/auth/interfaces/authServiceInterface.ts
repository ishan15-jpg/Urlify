import type { RegisterPayload, LoginPayload } from '../../../types';

export interface IAuthService {
    register(payload: RegisterPayload, confirmPassword?: string): Promise<any>;
    login(payload: LoginPayload): Promise<any>;
    logout(): Promise<any>;
};