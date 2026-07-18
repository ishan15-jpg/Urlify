export interface ApiMeta {
  requestId: string;
  timestamp: string;
}

// Standard generic envelope for all successful API responses
export interface ApiResponse<T = void> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta: ApiMeta;
}

// Standard generic envelope for all error API responses
export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  path: string;
  meta: ApiMeta;
}
