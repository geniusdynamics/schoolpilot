import { logger } from '@/utils/logging';

/**
 * Frappe SDK Client Wrapper
 * 
 * Direct API implementation for Frappe/ERPNext without external dependencies.
 * Provides a unified interface for database, file, and real-time operations.
 */

export interface FrappeSDKConfig {
  url: string;
  tokenParams?: {
    type?: 'Bearer' | 'token';
    useToken?: boolean;
  };
  enableSocketIO?: boolean;
  socketPort?: number;
}

export class FrappeSDKClient {
  private baseUrl: string;
  private apiKey: string | null = null;
  private apiSecret: string | null = null;
  private tokenType: 'Bearer' | 'token';
  
  constructor(private config: FrappeSDKConfig) {
    this.baseUrl = config.url.replace(/\/$/, ''); // Remove trailing slash
    this.tokenType = config.tokenParams?.type ?? 'token';
  }
  
  /**
   * Set authentication credentials
   */
  setAuth(apiKey: string, apiSecret: string): void {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }
  
  /**
   * Get authorization headers
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    if (this.apiKey && this.apiSecret) {
      if (this.tokenType === 'Bearer') {
        headers['Authorization'] = `Bearer ${this.apiKey}:${this.apiSecret}`;
      } else {
        headers['Authorization'] = `token ${this.apiKey}:${this.apiSecret}`;
      }
    }
    
    return headers;
  }
  
  /**
   * Make API request
   */
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.message || data;
  }
  
  /**
   * Database operations
   */
  get db() {
    return {
      /**
       * Get a single document
       */
      getDoc: async (doctype: string, name: string) => {
        return this.request(`/api/resource/${doctype}/${name}`);
      },
      
      /**
       * Get list of documents
       */
      getDocList: async (
        doctype: string,
        options: {
          fields?: string[];
          filters?: any[];
          limit?: number;
          offset?: number;
          orderBy?: { field: string; order: 'asc' | 'desc' };
        } = {}
      ) => {
        const { fields = ['*'], filters = [], limit = 100, offset = 0, orderBy } = options;
        
        const params = new URLSearchParams();
        params.append('fields', JSON.stringify(fields));
        if (filters.length > 0) {
          params.append('filters', JSON.stringify(filters));
        }
        params.append('limit_page_length', limit.toString());
        params.append('limit_start', offset.toString());
        
        if (orderBy) {
          params.append('order_by', `${orderBy.field} ${orderBy.order}`);
        }
        
        return this.request(`/api/resource/${doctype}?${params.toString()}`);
      },
      
      /**
       * Create a new document
       */
      createDoc: async (doctype: string, data: any) => {
        return this.request(`/api/resource/${doctype}`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
      
      /**
       * Update a document
       */
      updateDoc: async (doctype: string, name: string, data: any) => {
        return this.request(`/api/resource/${doctype}/${name}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      },
      
      /**
       * Delete a document
       */
      deleteDoc: async (doctype: string, name: string) => {
        return this.request(`/api/resource/${doctype}/${name}`, {
          method: 'DELETE',
        });
      },
      
      /**
       * Get count of documents
       */
      getCount: async (doctype: string, filters: any[] = []) => {
        const params = new URLSearchParams();
        if (filters.length > 0) {
          params.append('filters', JSON.stringify(filters));
        }
        
        const result = await this.request(`/api/resource/${doctype}?${params.toString()}&limit_page_length=1`);
        return result.length || 0;
      },
      
      /**
       * Get value from a document
       */
      getValue: async (doctype: string, name: string, fieldname: string) => {
        const doc = await this.request(`/api/resource/${doctype}/${name}?fields=["${fieldname}"]`);
        return doc[fieldname];
      },
      
      /**
       * Set value in a document
       */
      setValue: async (doctype: string, name: string, fieldname: string, value: any) => {
        return this.request(`/api/resource/${doctype}/${name}`, {
          method: 'PUT',
          body: JSON.stringify({ [fieldname]: value }),
        });
      },
    };
  }
  
  /**
   * File operations
   */
  get file() {
    return {
      /**
       * Upload a file
       */
      uploadFile: async (
        file: File | Blob,
        options: {
          isPrivate?: boolean;
          folder?: string;
          file_name?: string;
          doctype?: string;
          docname?: string;
          fieldname?: string;
        } = {}
      ) => {
        const formData = new FormData();
        formData.append('file', file, options.file_name);
        formData.append('is_private', options.isPrivate ? '1' : '0');
        formData.append('folder', options.folder || 'Home');
        
        if (options.doctype) formData.append('doctype', options.doctype);
        if (options.docname) formData.append('docname', options.docname);
        if (options.fieldname) formData.append('fieldname', options.fieldname);
        
        const headers = this.getAuthHeaders();
        delete headers['Content-Type']; // Let browser set it with boundary
        
        const response = await fetch(`${this.baseUrl}/api/method/upload_file`, {
          method: 'POST',
          headers,
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.message;
      },
      
      /**
       * Get file URL
       */
      getFileURL: (fileUrl: string) => {
        return `${this.baseUrl}${fileUrl}`;
      },
    };
  }
  
  /**
   * Call a server-side method
   */
  async call(method: string, args: any = {}): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(args).forEach(([key, value]) => {
      params.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    });
    
    return this.request(`/api/method/${method}?${params.toString()}`);
  }
  
  /**
   * Call a server-side method with POST
   */
  async callPost(method: string, args: any = {}): Promise<any> {
    return this.request(`/api/method/${method}`, {
      method: 'POST',
      body: JSON.stringify(args),
    });
  }
  
  /**
   * Authentication operations
   */
  get auth() {
    return {
      /**
       * Login with username and password
       */
      login: async (username: string, password: string) => {
        const response = await fetch(`${this.baseUrl}/api/method/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ usr: username, pwd: password }),
        });
        
        if (!response.ok) {
          throw new Error('Login failed');
        }
        
        const data = await response.json();
        return data.message;
      },
      
      /**
       * Logout
       */
      logout: async () => {
        return this.request('/api/method/logout', { method: 'POST' });
      },
      
      /**
       * Get current user
       */
      getCurrentUser: async () => {
        return this.request('/api/method/frappe.auth.get_logged_user');
      },
    };
  }
  
  /**
   * Socket.IO real-time operations
   */
  get realtime() {
    if (!this.config.enableSocketIO) {
      return null;
    }
    
    return {
      /**
       * Subscribe to document updates
       */
      subscribeToDoc: (doctype: string, docname: string, callback: (data: any) => void) => {
        // Socket.IO implementation would go here
        logger.info(`[FrappeSDK] Subscribed to ${doctype} ${docname}`);
      },
      
      /**
       * Unsubscribe from document updates
       */
      unsubscribeFromDoc: (doctype: string, docname: string) => {
        logger.info(`[FrappeSDK] Unsubscribed from ${doctype} ${docname}`);
      },
    };
  }
  
  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    logger.info('[FrappeSDK] Disconnecting...');
  }
}
