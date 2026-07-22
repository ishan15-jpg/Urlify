import AccountRepository from './accountRepository';
import AccountService from './accountService';
import apiClient from '../../api/apiClient';

const accountRepository = new AccountRepository(apiClient);
export const accountService = new AccountService(accountRepository);
