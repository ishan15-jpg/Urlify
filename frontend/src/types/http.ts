export interface IHttpClient {
  get<T>(url: string, data?: any): Promise<T>;
  post<T>(url: string, data?: any): Promise<T>;
  put<T>(url: string, data?: any): Promise<T>;
  patch<T>(url: string, data?: any): Promise<T>;     
  delete<T>(url: string, data?: any): Promise<T>;     
}
