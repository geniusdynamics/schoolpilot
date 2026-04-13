/**
 * ERPNext API Client
 * 
 * Low-level HTTP client for ERPNext REST API.
 */

export class ERPNextClient {
  private apiKey: string | null = null;
  private apiSecret: string | null = null;
  
  constructor(
    private baseUrl: string,
    private timeout: number = 30000
  ) {
    // Remove trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }
  
  setAuth(apiKey: string, apiSecret: string): void {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }
  
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey && this.apiSecret) {
      headers['Authorization'] = `token ${this.apiKey}:${this.apiSecret}`;
    }
    
    return headers;
  }
  
  async get(endpoint: string): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(this.timeout),
    });
  }
  
  async post(endpoint: string, data: any): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(this.timeout),
    });
  }
  
  async put(endpoint: string, data: any): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(this.timeout),
    });
  }
  
  async delete(endpoint: string): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(this.timeout),
    });
  }
  
  async uploadFile(endpoint: string, formData: FormData): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {};
    
    if (this.apiKey && this.apiSecret) {
      headers['Authorization'] = `token ${this.apiKey}:${this.apiSecret}`;
    }
    
    return fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      signal: AbortSignal.timeout(this.timeout),
    });
  }
}
