import { logger } from '@/utils/logging';

/**
 * Generic SMS Gateway Plugin
 * 
 * Flexible SMS integration that works with any HTTP-based SMS API.
 * Supports multiple authentication methods, request formats, and response parsing.
 * 
 * Compatible with:
 * - Twilio
 * - Nexmo/Vonage
 * - Africa's Talking
 * - MessageBird
 * - Plivo
 * - Clickatell
 * - Any custom SMS API
 */

import type {
  SMSPlugin,
  SMSResult,
  BulkSMSResult,
  PluginManifest,
  PluginModule,
  PluginContext,
} from '../../types';

// ============================================================================
// Types
// ============================================================================

interface SMSGatewayConfig {
  provider: string;
  apiUrl: string;
  authType: 'apikey' | 'bearer' | 'basic' | 'custom' | 'query' | 'none';
  apiKey?: string;
  apiSecret?: string;
  apiKeyHeader?: string;
  username?: string;
  password?: string;
  customHeaders?: Record<string, string>;
  sendEndpoint: string;
  httpMethod: 'POST' | 'GET' | 'PUT';
  requestFormat: 'json' | 'form' | 'query';
  phoneField: string;
  messageField: string;
  senderIdField?: string;
  senderId?: string;
  additionalFields?: Record<string, any>;
  responseFormat: 'json' | 'xml' | 'text';
  successField: string;
  successValue: string;
  messageIdField: string;
  statusEndpoint?: string;
  timeout: number;
  retryAttempts: number;
  enableLogging: boolean;
}

// ============================================================================
// Provider Presets
// ============================================================================

const PROVIDER_PRESETS: Record<string, Partial<SMSGatewayConfig>> = {
  twilio: {
    sendEndpoint: '/2010-04-01/Accounts/{AccountSid}/Messages.json',
    httpMethod: 'POST',
    requestFormat: 'form',
    phoneField: 'To',
    messageField: 'Body',
    senderIdField: 'From',
    authType: 'basic',
    responseFormat: 'json',
    successField: 'status',
    successValue: 'queued',
    messageIdField: 'sid',
  },
  nexmo: {
    sendEndpoint: '/sms/json',
    httpMethod: 'POST',
    requestFormat: 'json',
    phoneField: 'to',
    messageField: 'text',
    senderIdField: 'from',
    authType: 'query',
    responseFormat: 'json',
    successField: 'messages.0.status',
    successValue: '0',
    messageIdField: 'messages.0.message-id',
  },
  africastalking: {
    sendEndpoint: '/version1/messaging',
    httpMethod: 'POST',
    requestFormat: 'form',
    phoneField: 'to',
    messageField: 'message',
    senderIdField: 'from',
    authType: 'apikey',
    apiKeyHeader: 'apiKey',
    responseFormat: 'json',
    successField: 'SMSMessageData.Recipients.0.status',
    successValue: 'Success',
    messageIdField: 'SMSMessageData.Recipients.0.messageId',
  },
  messagebird: {
    sendEndpoint: '/messages',
    httpMethod: 'POST',
    requestFormat: 'json',
    phoneField: 'recipients',
    messageField: 'body',
    senderIdField: 'originator',
    authType: 'apikey',
    apiKeyHeader: 'Authorization',
    responseFormat: 'json',
    successField: 'recipients.items.0.status',
    successValue: 'sent',
    messageIdField: 'id',
  },
  plivo: {
    sendEndpoint: '/Account/{auth_id}/Message/',
    httpMethod: 'POST',
    requestFormat: 'json',
    phoneField: 'dst',
    messageField: 'text',
    senderIdField: 'src',
    authType: 'basic',
    responseFormat: 'json',
    successField: 'message',
    successValue: 'message(s) queued',
    messageIdField: 'message_uuid.0',
  },
  clickatell: {
    sendEndpoint: '/messages',
    httpMethod: 'POST',
    requestFormat: 'json',
    phoneField: 'to',
    messageField: 'content',
    senderIdField: 'from',
    authType: 'apikey',
    apiKeyHeader: 'Authorization',
    responseFormat: 'json',
    successField: 'messages.0.accepted',
    successValue: 'true',
    messageIdField: 'messages.0.apiMessageId',
  },
};

// ============================================================================
// SMS Gateway Client
// ============================================================================

class SMSGatewayClient {
  private config: SMSGatewayConfig;
  private baseUrl: string;

  constructor(config: SMSGatewayConfig) {
    this.config = config;
    this.baseUrl = config.apiUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Send SMS via HTTP API
   */
  async sendSMS(phone: string, message: string): Promise<SMSResult> {
    const url = this.buildUrl();
    const headers = this.buildHeaders();
    const body = this.buildRequestBody(phone, message);

    if (this.config.enableLogging) {
      logger.info('[SMS Gateway] Sending SMS:', {
        provider: this.config.provider,
        url,
        phone,
        messageLength: message.length,
      });
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await this.makeRequest(url, headers, body);
        return this.parseResponse(response, phone);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          logger.warn(`[SMS Gateway] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    return {
      success: false,
      messageId: this.generateFallbackId(),
      status: 'failed',
      recipient: phone,
      message: `Failed after ${this.config.retryAttempts + 1} attempts: ${lastError?.message}`,
    };
  }

  /**
   * Build full URL with endpoint
   */
  private buildUrl(): string {
    let endpoint = this.config.sendEndpoint;
    
    // Replace placeholders in endpoint
    if (this.config.username) {
      endpoint = endpoint.replace('{AccountSid}', this.config.username);
      endpoint = endpoint.replace('{auth_id}', this.config.username);
    }
    
    return `${this.baseUrl}${endpoint}`;
  }

  /**
   * Build request headers based on auth type
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': this.getContentType(),
      'Accept': 'application/json',
    };

    // Add authentication headers
    switch (this.config.authType) {
      case 'apikey':
        if (this.config.apiKey) {
          const headerName = this.config.apiKeyHeader || 'X-API-Key';
          headers[headerName] = this.config.apiKey;
        }
        break;

      case 'bearer':
        if (this.config.apiKey) {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
        break;

      case 'basic':
        if (this.config.username && this.config.password) {
          const credentials = btoa(`${this.config.username}:${this.config.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;

      case 'custom':
        if (this.config.customHeaders) {
          Object.assign(headers, this.config.customHeaders);
        }
        break;
    }

    return headers;
  }

  /**
   * Get content type based on request format
   */
  private getContentType(): string {
    switch (this.config.requestFormat) {
      case 'json':
        return 'application/json';
      case 'form':
        return 'application/x-www-form-urlencoded';
      case 'query':
        return 'application/json';
      default:
        return 'application/json';
    }
  }

  /**
   * Build request body based on format
   */
  private buildRequestBody(phone: string, message: string): any {
    const data: Record<string, any> = {
      [this.config.phoneField]: phone,
      [this.config.messageField]: message,
    };

    // Add sender ID if configured
    if (this.config.senderId && this.config.senderIdField) {
      data[this.config.senderIdField] = this.config.senderId;
    }

    // Add additional fields
    if (this.config.additionalFields) {
      Object.assign(data, this.config.additionalFields);
    }

    // Add auth params for query auth
    if (this.config.authType === 'query') {
      if (this.config.apiKey) data.api_key = this.config.apiKey;
      if (this.config.apiSecret) data.api_secret = this.config.apiSecret;
    }

    return data;
  }

  /**
   * Make HTTP request
   */
  private async makeRequest(
    url: string,
    headers: Record<string, string>,
    body: any
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      let fetchUrl = url;
      const fetchOptions: RequestInit = {
        method: this.config.httpMethod,
        headers,
        signal: controller.signal,
      };

      // Format body based on request format
      if (this.config.httpMethod === 'GET' || this.config.requestFormat === 'query') {
        const params = new URLSearchParams(body);
        fetchUrl = `${url}?${params.toString()}`;
      } else if (this.config.requestFormat === 'json') {
        fetchOptions.body = JSON.stringify(body);
      } else if (this.config.requestFormat === 'form') {
        const params = new URLSearchParams(body);
        fetchOptions.body = params.toString();
      }

      const response = await fetch(fetchUrl, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse response based on format
      switch (this.config.responseFormat) {
        case 'json':
          return await response.json();
        case 'xml':
          return await response.text(); // Would need XML parser
        case 'text':
          return await response.text();
        default:
          return await response.json();
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse API response
   */
  private parseResponse(response: any, phone: string): SMSResult {
    try {
      // Extract success status
      const success = this.extractField(response, this.config.successField);
      const isSuccess = String(success) === this.config.successValue;

      // Extract message ID
      const messageId = this.extractField(response, this.config.messageIdField) || this.generateFallbackId();

      return {
        success: isSuccess,
        messageId: String(messageId),
        status: isSuccess ? 'sent' : 'failed',
        recipient: phone,
        message: isSuccess ? 'SMS sent successfully' : 'SMS sending failed',
      };
    } catch (error) {
      logger.error('[SMS Gateway] Failed to parse response:', error);
      return {
        success: false,
        messageId: this.generateFallbackId(),
        status: 'failed',
        recipient: phone,
        message: `Failed to parse response: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Extract nested field from object using dot notation
   */
  private extractField(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Generate fallback message ID
   */
  private generateFallbackId(): string {
    return `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check message delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<string> {
    if (!this.config.statusEndpoint) {
      return 'unknown';
    }

    try {
      const url = `${this.baseUrl}${this.config.statusEndpoint.replace('{messageId}', messageId)}`;
      const headers = this.buildHeaders();

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        return 'unknown';
      }

      const data = await response.json();
      const status = this.extractField(data, 'status') || 'unknown';
      return String(status).toLowerCase();
    } catch (error) {
      logger.error('[SMS Gateway] Failed to check status:', error);
      return 'unknown';
    }
  }
}

// ============================================================================
// Plugin Implementation
// ============================================================================

let client: SMSGatewayClient | null = null;
let config: SMSGatewayConfig | null = null;

export const smsGatewayPlugin: SMSPlugin = {
  async send(phone: string, message: string): Promise<SMSResult> {
    if (!client) {
      throw new Error('SMS Gateway not initialized. Please configure the plugin settings.');
    }

    return client.sendSMS(phone, message);
  },

  async bulkSend(recipients: string[], message: string): Promise<BulkSMSResult> {
    if (!client) {
      throw new Error('SMS Gateway not initialized. Please configure the plugin settings.');
    }

    const results: SMSResult[] = [];

    for (const phone of recipients) {
      const result = await client.sendSMS(phone, message);
      results.push(result);
      
      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return {
      total: recipients.length,
      successful,
      failed,
      results,
    };
  },

  async sendTemplate(
    phone: string,
    templateId: string,
    params: Record<string, any>
  ): Promise<SMSResult> {
    // Template rendering would be handled by the application
    // This is a placeholder that just sends the template ID
    const message = `Template: ${templateId} with params: ${JSON.stringify(params)}`;
    return this.send(phone, message);
  },

  async getDeliveryStatus(messageId: string): Promise<string> {
    if (!client) {
      return 'unknown';
    }

    return client.getDeliveryStatus(messageId);
  },
};

// ============================================================================
// Plugin Module
// ============================================================================

const module: PluginModule = {
  async activate(context: PluginContext) {
    logger.info('[SMS Gateway Plugin] Activating...');

    // Load configuration
    const settings = context.settings || {};
    
    // Check if configured
    if (!settings.apiUrl) {
      logger.info('[SMS Gateway Plugin] No configuration found - plugin enabled but not configured');
      
      context.api.showNotification(
        'SMS Gateway plugin enabled. Please configure your SMS provider settings.',
        'info'
      );
      
      // Plugin is active but not functional until configured
      return;
    }
    
    const provider = settings.provider || 'custom';

    // Merge preset with custom settings
    const preset = PROVIDER_PRESETS[provider] || {};
    config = {
      ...preset,
      ...settings,
    } as SMSGatewayConfig;

    // Initialize client
    client = new SMSGatewayClient(config);

    logger.info(`[SMS Gateway Plugin] Configured for provider: ${provider}`);
    logger.info(`[SMS Gateway Plugin] API URL: ${config.apiUrl}`);
    logger.info(`[SMS Gateway Plugin] Auth Type: ${config.authType}`);
    
    context.api.showNotification(
      `SMS Gateway activated with ${provider} provider`,
      'success'
    );
  },

  async deactivate() {
    logger.info('[SMS Gateway Plugin] Deactivating...');
    client = null;
    config = null;
  },
};

// ============================================================================
// Export
// ============================================================================

export default {
  manifest: {
    id: 'com.schoolpilot.sms-gateway',
    name: 'Generic SMS Gateway',
    version: '1.0.0',
    type: 'integration',
    category: 'community',
    entry: './index.ts',
    description: 'Connect to any SMS API provider with configurable HTTP endpoints, authentication, and message formatting.',
    author: 'SchoolPilot3 Team',
    license: 'MIT',
  },
  module,
  plugin: smsGatewayPlugin,
};
