export interface IHttpClient {
  post<T>(url: string, data?: any): Promise<T>;
}
