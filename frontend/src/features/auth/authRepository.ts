import type {
  IHttpClient,
  LoginPayload,
  RegisterPayload,
  EmailVerificationLinkPayload,
  VerifyEmailPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  UpdatePasswordPayload
} from '../../types';
import type { ApiResponse } from '../../types/apiResponse';
import type { LoginResponseData, VerifyEmailResponseData, RegisterResponseData, EmailVerificationLinkResponseData, RefreshResponseData } from '../../types/authResponse';
import type { IAuthRepository } from './interfaces/authRepositoryInterface';

// --- AuthRepository implementation ---

export default class AuthRepository implements IAuthRepository {
  private apiClient: IHttpClient;

  constructor(apiClient: IHttpClient) {
    this.apiClient = apiClient;
  }

  /**
   * Authenticates a user and issues an access token.
   */
  public async login(data: LoginPayload): Promise<ApiResponse<LoginResponseData>> {
    return this.apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', data);
  }

  /**
   * Authenticates a user and issues an access token.
   */
  public async logout(): Promise<ApiResponse<null>> {
    return this.apiClient.post<ApiResponse<null>>('/auth/logout');
  }

  /**
   * Creates a new user account and triggers an email verification flow.
   */
  public async register(data: RegisterPayload): Promise<ApiResponse<RegisterResponseData>> {
    return this.apiClient.post<ApiResponse<RegisterResponseData>>('/auth/register', data);
  }

  /**
   * Sends an email verification link.
   */
  public async sendEmailVerificationLink(data: EmailVerificationLinkPayload): Promise<ApiResponse<EmailVerificationLinkResponseData>> {
    return this.apiClient.post<ApiResponse<EmailVerificationLinkResponseData>>('/auth/email-verification-link', data);
  }

  /**
   * Verifies an email using the token sent to the user.
   */
  public async verifyEmail(data: VerifyEmailPayload): Promise<ApiResponse<VerifyEmailResponseData>> {
    return this.apiClient.post<ApiResponse<VerifyEmailResponseData>>('/auth/verify-email', data);
  }

  /**
   * Initiates the forgot password flow by sending a reset link.
   */
  public async forgotPassword(data: ForgotPasswordPayload): Promise<ApiResponse<null>> {
    return this.apiClient.post<ApiResponse<null>>('/auth/forgot-password', data);
  }

  /**
   * Resets the user's password using the provided token.
   */
  public async resetPassword(data: ResetPasswordPayload): Promise<ApiResponse<null>> {
    return this.apiClient.post<ApiResponse<null>>('/auth/reset-password', data);
  }

  /**
   * Refreshes the access token.
   */
  public async refreshToken(): Promise<ApiResponse<RefreshResponseData>> {
    return this.apiClient.post<ApiResponse<RefreshResponseData>>('/auth/refresh');
  }

  /**
   * Refreshes the access token.
   */
  public async updatePassword(data: UpdatePasswordPayload): Promise<ApiResponse<null>> {
    return this.apiClient.post<ApiResponse<null>>('/auth/update-password', data);
  }
}