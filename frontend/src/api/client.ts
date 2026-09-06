// ============================================================
// NEXUS RESQ — FRONTEND API CLIENT
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  user?: any;
  current?: any;
  error?: string;
  count?: number;
  message?: string;
  [key: string]: any;
}

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('nexus_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  public async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`[API Client Warning] GET ${endpoint} failed:`, err.message);
      return { success: false, error: err.message };
    }
  }

  public async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`[API Client Warning] POST ${endpoint} failed:`, err.message);
      return { success: false, error: err.message };
    }
  }

  public async put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`[API Client Warning] PUT ${endpoint} failed:`, err.message);
      return { success: false, error: err.message };
    }
  }

  public async patch<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`[API Client Warning] PATCH ${endpoint} failed:`, err.message);
      return { success: false, error: err.message };
    }
  }

  public async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`[API Client Warning] DELETE ${endpoint} failed:`, err.message);
      return { success: false, error: err.message };
    }
  }
}

export const apiClient = new ApiClient();
