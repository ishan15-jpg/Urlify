import { db } from '../shared/config/database.config';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

// 1. Instantiate the repository
const usersRepository = new UsersRepository(db);

// 2. Instantiate the service, injecting the repository
const usersService = new UsersService(usersRepository);

// 3. Instantiate the controller, injecting the service
export const usersController = new UsersController(usersService);
