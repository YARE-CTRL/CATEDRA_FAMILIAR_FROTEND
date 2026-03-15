// ============================================
// HTTP SERVICE - Servicio centralizado para llamadas API
// ============================================

interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

class HttpService {
  private config: ApiConfig;

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = {
      // Usar proxy de Vite en desarrollo para evitar problemas CORS
      baseURL: config.baseURL || (import.meta.env.DEV ? '/api' : 'http://localhost:3333'),
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...config.headers
      }
    };
  }

  private getAuthToken(): string | null {
    try {
      const session = localStorage.getItem('session');
      const directToken = localStorage.getItem('auth_token');
      if (typeof directToken === 'string' && directToken.trim()) {
        return directToken.replace(/^Bearer\s+/i, '').trim();
      }
      if (session) {
        const parsedSession = JSON.parse(session);
        const rawToken =
          parsedSession?.token ||
          parsedSession?.accessToken ||
          parsedSession?.access_token ||
          parsedSession?.jwt ||
          parsedSession?.authToken ||
          parsedSession?.data?.token ||
          parsedSession?.data?.accessToken ||
          parsedSession?.data?.access_token ||
          parsedSession?.user?.token ||
          parsedSession?.user?.accessToken ||
          parsedSession?.user?.access_token ||
          null;

        if (typeof rawToken === 'string' && rawToken.trim()) {
          return rawToken.replace(/^Bearer\s+/i, '').trim();
        }

        return null;
      }
    } catch (e) {
      console.warn('Error parsing session:', e);
    }
    return null;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { 
      ...this.config.headers,
      'ngrok-skip-browser-warning': 'true' // Evitar página de advertencia de ngrok
    };
    
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('[DEBUG][HTTP] Token JWT encontrado y agregado a headers:', {
        token: token.substring(0, 20) + '...',
        tokenLength: token.length,
        fullHeader: `Bearer ${token.substring(0, 20)}...`
      });
    } else {
      console.log('[DEBUG][HTTP] No se encontró token JWT en la sesión');
    }

    console.log('[DEBUG][HTTP] Headers finales:', {
      ...headers,
      Authorization: headers.Authorization ? `${headers.Authorization.toString().substring(0, 27)}...` : '[No Authorization]'
    });

    return headers;
  }

  private async handleResponse<T>(response: Response, responseType?: 'blob'): Promise<HttpResponse<T>> {
    let data: T;

    if (responseType === 'blob') {
      data = await response.blob() as T;
    } else {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const jsonText = await response.text();
        console.log('[DEBUG][HTTP] Response body (raw):', jsonText);
        data = JSON.parse(jsonText) as T;
        console.log('[DEBUG][HTTP] Response body (parsed):', data);
      } else {
        data = await response.text() as unknown as T;
        console.log('[DEBUG][HTTP] Response body (text):', data);
      }
    }

    console.log('[DEBUG][HTTP] Response completa:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      data: data,
      contentType: response.headers.get('content-type')
    });

    if (!response.ok) {
      const error: ApiError = {
        message: response.statusText || 'Error en la solicitud',
        status: response.status
      };

      // Si hay data con mensaje de error del servidor y no es blob
      if (responseType !== 'blob' && typeof data === 'object' && data !== null && 'message' in data) {
        error.message = (data as any).message;
      }

      throw error;
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      url: response.url
    };
  }

  async get<T = any>(endpoint: string, params?: Record<string, any> & { responseType?: 'blob' }): Promise<HttpResponse<T>> {
    // Detectar si es un endpoint de uploads para usar el proxy correcto
    const isUploadsEndpoint = endpoint.startsWith('/uploads/') || endpoint.startsWith('uploads/');
    
    // Construir URL correctamente
    let base: string;
    if (isUploadsEndpoint) {
      // Para uploads, usar el proxy /uploads directamente
      base = import.meta.env.DEV ? '' : this.config.baseURL;
    } else {
      // Para otros endpoints, usar el base URL configurado
      base = this.config.baseURL.endsWith('/') ? this.config.baseURL.slice(0, -1) : this.config.baseURL;
    }
    
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const url = new URL(`${base}${path}`, origin);
 
if (params) {
  Object.entries(params).forEach(([key, value]) => {
    if (key !== 'responseType' && value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
}
 
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      console.log(`[DEBUG][API] GET:`, url.toString());
      const headers = this.getHeaders();
      
      // Si se solicita blob, cambiar el header Accept
      if (params?.responseType === 'blob') {
        headers['Accept'] = 'application/octet-stream, image/*, application/pdf, */*';
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      console.log(`[DEBUG][API] GET Response:`, response.status, response.statusText);
      return await this.handleResponse<T>(response, params?.responseType);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async post<T = any>(endpoint: string, data?: any): Promise<HttpResponse<T>> {
    return this.request<T>('POST', endpoint, data);
  }

  async put<T = any>(endpoint: string, data?: any): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', endpoint, data);
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<HttpResponse<T>> {
    return this.request<T>('PATCH', endpoint, data);
  }

  async delete<T = any>(endpoint: string): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', endpoint);
  }

  private async request<T = any>(method: string, endpoint: string, data?: any): Promise<HttpResponse<T>> {
    // Construir URL correctamente
    const base = this.config.baseURL.endsWith('/') ? this.config.baseURL.slice(0, -1) : this.config.baseURL;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${base}${path}`;
    const controller = new AbortController();
    
    console.log('[DEBUG][HTTP] Petición:', {
      method,
      url,
      baseURL: this.config.baseURL,
      endpoint,
      path,
      data: data ? JSON.stringify(data, null, 2) : 'no data'
    });
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const headers = this.getHeaders();
    if (isFormData) {
      // Let the browser set the correct multipart boundary
      delete (headers as any)['Content-Type'];
    }

    const options: RequestInit = {
      method,
      headers,
      signal: controller.signal
    };

    if (data && method !== 'GET' && method !== 'DELETE') {
      options.body = isFormData ? data : JSON.stringify(data);
    }

    try {
      console.log(`[DEBUG][API] ${method}:`, url.toString());
      console.log(`[DEBUG][API] Headers:`, headers);
      console.log(`[DEBUG][API] Body:`, data ? (isFormData ? '[FormData]' : JSON.stringify(data, null, 2)) : '[No body]');
      console.log(`[DEBUG][API] Options:`, {
        method,
        headers: Object.keys(headers),
        hasBody: !!data,
        isFormData,
        bodySize: data ? (isFormData ? 'FormData' : JSON.stringify(data).length) : 0
      });
      
      const response = await fetch(url, options);
      console.log(`[DEBUG][API] ${method} Response:`, response.status, response.statusText);
      
      // Log response headers
      console.log(`[DEBUG][API] Response Headers:`, Object.fromEntries(response.headers.entries()));
      
      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Método para actualizar token de autorización
  setAuthToken(token: string | null) {
    if (token) {
      this.config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.config.headers['Authorization'];
    }
  }

  // Método para interceptar respuestas 401 y redirigir al login
  setupUnauthorizedInterceptor(callback: () => void) {
    let consecutiveUnauthorized = 0;
    let lastUnauthorizedTime = 0;
    
    const originalHandleResponse = this.handleResponse.bind(this);
    this.handleResponse = async function<T>(this: HttpService, response: Response, responseType?: 'blob'): Promise<HttpResponse<T>> {
      // Solo ejecutar logout en 401 si NO es un endpoint de login
      const isLoginEndpoint = response.url.includes('/login');
      
      if (response.status === 401 && !isLoginEndpoint) {
        const now = Date.now();
        console.warn('⚠️ [HTTP] 401 Unauthorized en:', response.url);
        
        // Si es el mismo segundo que el último 401, incrementar contador
        if (now - lastUnauthorizedTime < 1000) {
          consecutiveUnauthorized++;
        } else {
          consecutiveUnauthorized = 1;
        }
        lastUnauthorizedTime = now;
        
        // Solo cerrar sesión si hay múltiples 401 consecutivos (indica sesión realmente expirada)
        // O si es un endpoint crítico que no debería fallar nunca
        const isCriticalEndpoint = response.url.includes('/me') || response.url.includes('/estadisticas');
        
        if (consecutiveUnauthorized >= 3 || isCriticalEndpoint) {
          console.error('💥 [HTTP] Múltiples 401 o endpoint crítico - Sesión expirada, cerrando sesión');
          callback();
        } else {
          console.warn(`📊 [HTTP] 401 #${consecutiveUnauthorized} - Permitiendo fallback...`);
        }
      } else if (response.ok) {
        // Reset contador en respuesta exitosa
        consecutiveUnauthorized = 0;
      }
      
      return originalHandleResponse(response, responseType);
    };
  }
}

// Instancia singleton del servicio HTTP
export const httpService = new HttpService();

// Configurar interceptor de 401 para logout automático
httpService.setupUnauthorizedInterceptor(() => {
  // Solo limpiar sesión si realmente existe una
  const session = localStorage.getItem('session');
  if (session) {
    console.warn('🚪 [HTTP] Limpiando sesión y redirigiendo a login...');
    localStorage.removeItem('session');
    localStorage.removeItem('previewRole');
    window.location.href = '/login';
  }
});

export default httpService;
