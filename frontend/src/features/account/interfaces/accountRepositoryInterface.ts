import type { UserProfileResponse } from '../../../types';
import type { ApiResponse } from '../../../types/apiResponse';

export interface IAccountRepository {
  getProfile(): Promise<ApiResponse<UserProfileResponse>>;
}
