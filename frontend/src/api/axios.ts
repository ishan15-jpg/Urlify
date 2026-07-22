import axios, { type AxiosInstance } from 'axios';
import interceptorManager from './interceptor';
import env from '../config/env';

class AxiosClient {
  private static instance: AxiosClient;
  public axiosInstance: AxiosInstance;

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: env.API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    interceptorManager.setupInterceptors(this.axiosInstance);
  }

  public static getInstance(): AxiosClient {
    if (!AxiosClient.instance) {
      AxiosClient.instance = new AxiosClient();
    }
    return AxiosClient.instance;
  }


}

// Export the singleton Axios instance
const axiosClient = AxiosClient.getInstance().axiosInstance;
export default axiosClient;
