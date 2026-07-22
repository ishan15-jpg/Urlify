import type { User } from '../../types';
import type { IAccountRepository } from './interfaces/accountRepositoryInterface';
import type { IAccountService } from './interfaces/accountServiceInterface';

export default class AccountService implements IAccountService {
  private accountRepository: IAccountRepository;

  constructor(accountRepository: IAccountRepository) {
    this.accountRepository = accountRepository;
  }

  public async getProfile(): Promise<User> {
    const response = await this.accountRepository.getProfile();
    return response.data.user;
  }
}
