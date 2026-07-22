import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import STORAGE_KEYS from '../constants/storageKeys';
import env from '../config/env';

interface FailedRequestQueueItem {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}

class InterceptorManager {
  private static instance: InterceptorManager;
  private isRefreshing = false;
  private failedQueue: FailedRequestQueueItem[] = [];

  private constructor() {}

  public static getInstance(): InterceptorManager {
    if (!InterceptorManager.instance) {
      InterceptorManager.instance = new InterceptorManager();
    }
    return InterceptorManager.instance;
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
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
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return instance(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            // Avoid using the intercepted instance here to prevent loops on 401
            const response = await axios.post(`${env.API_URL}/auth/refresh`, {}, {
              withCredentials: true
            });
            
            const newAccessToken = response.data?.data?.accessToken;
            if (newAccessToken) {
              localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
              this.processQueue(null, newAccessToken);
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return instance(originalRequest);
            } else {
              throw new Error("No access token returned from refresh");
            }
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            // Dispatch a custom event to tell AuthenticationContext to log out
            window.dispatchEvent(new Event('auth:logout'));
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }
}

const interceptorManager = InterceptorManager.getInstance();
export default interceptorManager;
