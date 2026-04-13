/**
 * GraphQL Client for SaaS Backend
 * 
 * GraphQL client with query caching and batching support.
 */

export interface GraphQLClientConfig {
  url: string;
  timeout: number;
  tenantId: string;
}

export class GraphQLClient {
  private authToken: string | null = null;
  private queryCache = new Map<string, { data: any; timestamp: number }>();
  
  constructor(private config: GraphQLClientConfig) {}
  
  setAuth(token: string): void {
    this.authToken = token;
  }
  
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.config.tenantId,
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }
  
  async query(query: string, variables?: any): Promise<any> {
    const cacheKey = `${query}:${JSON.stringify(variables)}`;
    
    // Check cache
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      return cached.data;
    }
    
    const response = await fetch(this.config.url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(this.config.timeout),
    });
    
    if (!response.ok) {
      throw new Error(`GraphQL query failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }
    
    // Cache result
    this.queryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });
    
    return result;
  }
  
  async mutate(mutation: string, variables?: any): Promise<any> {
    const response = await fetch(this.config.url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query: mutation, variables }),
      signal: AbortSignal.timeout(this.config.timeout),
    });
    
    if (!response.ok) {
      throw new Error(`GraphQL mutation failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }
    
    // Clear cache on mutations
    this.queryCache.clear();
    
    return result;
  }
}
