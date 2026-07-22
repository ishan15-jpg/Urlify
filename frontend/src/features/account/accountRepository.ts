import type { IHttpClient, UserProfileResponse } from '../../types';
import type { ApiResponse } from '../../types/apiResponse';
import type { IAccountRepository } from './interfaces/accountRepositoryInterface';

export default class AccountRepository implements IAccountRepository {
  private apiClient: IHttpClient;

  constructor(apiClient: IHttpClient) {
    this.apiClient = apiClient;
  }

  public async getProfile(): Promise<ApiResponse<UserProfileResponse>> {
    return this.apiClient.get<ApiResponse<UserProfileResponse>>('/users/me');
  }
}
