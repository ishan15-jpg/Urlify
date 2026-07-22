import type { User } from '../../../types';

export interface IAccountService {
  getProfile(): Promise<User>;
}
