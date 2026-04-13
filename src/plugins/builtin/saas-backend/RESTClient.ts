/**
 * REST Client for SaaS Backend
 * 
 * HTTP client with retry logic, compression, and tenant isolation.
 */

export interface RESTClientConfig {
  baseUrl: string;
  timeout: number;
  tenantId: string;
  apiVersion: string;
  enableCompression: boolean;
  retryAttempts: number;
}

export class RESTClient {
  private authToken: string | null = null;
  
  constructor(private config: RESTClientConfig) {
    this.config.baseUrl = this.config.baseUrl.replace(/\/$/, '');
  }
  
  setAuth(token: string): void {
    this.authToken = token;
  }
  
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.config.tenantId,
      'X-API-Version': this.config.apiVersion,
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    if (this.config.enableCompression) {
      headers['Accept-Encoding'] = 'gzip, deflate';
    }
    
    return headers;
  }
  
  private async makeRequest(
    method: string,
    endpoint: string,
    body?: any,
    attempt = 0
  ): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.config.timeout),
      });
      
      // Retry on 5xx errors
      if (response.status >= 500 && attempt < this.config.retryAttempts) {
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        return this.makeRequest(method, endpoint, body, attempt + 1);
      }
      
      return response;
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        await this.delay(Math.pow(2, attempt) * 1000);
        return this.makeRequest(method, endpoint, body, attempt + 1);
      }
      throw error;
    }
  }
  
  async get(endpoint: string): Promise<Response> {
    return this.makeRequest('GET', endpoint);
  }
  
  async post(endpoint: string, data: any): Promise<Response> {
    return this.makeRequest('POST', endpoint, data);
  }
  
  async put(endpoint: string, data: any): Promise<Response> {
    return this.makeRequest('PUT', endpoint, data);
  }
  
  async delete(endpoint: string): Promise<Response> {
    return this.makeRequest('DELETE', endpoint);
  }
  
  async uploadFile(endpoint: string, formData: FormData): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'X-Tenant-ID': this.config.tenantId,
      'X-API-Version': this.config.apiVersion,
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      signal: AbortSignal.timeout(this.config.timeout),
    });
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
