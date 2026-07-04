import { db } from '../shared/config/database.config';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

/**
 * Auth module composition root — wires the dependency graph for this module.
 *
 * Instantiation order: Repository → Service → Controller
 * Each level receives the abstraction (interface) of the layer below,
 * keeping layers decoupled and individually testable.
 */
const authRepository = new AuthRepository(db);
const authService = new AuthService(authRepository);
export const authController = new AuthController(authService);
