export interface IHttpClient {
  get<T>(url: string, data?: any): Promise<T>;
  post<T>(url: string, data?: any): Promise<T>;
}
