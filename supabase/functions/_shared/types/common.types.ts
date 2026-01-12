export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FileUpload {
  file: File;
  analysisId: string;
}

export interface User {
  id: string;
  email: string;
}

export interface DatabaseError {
  code: string;
  message: string;
  details?: unknown;
}
