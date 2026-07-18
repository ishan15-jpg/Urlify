import { type AxiosInstance } from 'axios';
import STORAGE_KEYS from '../constants/storageKeys';

class InterceptorManager {
  private static instance: InterceptorManager;

  private constructor() {}

  public static getInstance(): InterceptorManager {
    if (!InterceptorManager.instance) {
      InterceptorManager.instance = new InterceptorManager();
    }
    return InterceptorManager.instance;
  }

  public setupInterceptors(instance: AxiosInstance) {
    // Request Interceptor
    instance.interceptors.request.use(
      (config) => {
        // You can attach authentication tokens here in the future
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response Interceptor
    instance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        // Handle global errors, like 401 Unauthorized, here
        return Promise.reject(error);
      }
    );
  }
}

const interceptorManager = InterceptorManager.getInstance();
export default interceptorManager;
