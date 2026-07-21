import AuthRepository from "./authRepository";
import apiClient from "../../api/apiClient";
import AuthService from "./authService";


const authRepository = new AuthRepository(apiClient);
export const authService = new AuthService(authRepository);