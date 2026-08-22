import { logger } from '@/utils/logging';

/**
 * WebSocket Client for SaaS Backend
 * 
 * WebSocket client for real-time updates with automatic reconnection.
 */

export interface WebSocketClientConfig {
  url: string;
  tenantId: string;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private authToken: string | null = null;
  private subscriptions = new Map<string, Set<(data: any) => void>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  constructor(private config: WebSocketClientConfig) {
    this.connect();
  }
  
  setAuth(token: string): void {
    this.authToken = token;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.authenticate();
    }
  }
  
  private connect(): void {
    const url = `${this.config.url}?tenant=${this.config.tenantId}`;
    
    try {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        logger.info('[WebSocketClient] Connected');
        this.reconnectAttempts = 0;
        
        if (this.authToken) {
          this.authenticate();
        }
        
        // Resubscribe to all channels
        for (const channel of this.subscriptions.keys()) {
          this.sendSubscribe(channel);
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          logger.error('[WebSocketClient] Failed to parse message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        logger.error('[WebSocketClient] Error:', error);
      };
      
      this.ws.onclose = () => {
        logger.info('[WebSocketClient] Disconnected');
        this.attemptReconnect();
      };
    } catch (error) {
      logger.error('[WebSocketClient] Failed to connect:', error);
      this.attemptReconnect();
    }
  }
  
  private authenticate(): void {
    if (!this.ws || !this.authToken) return;
    
    this.ws.send(JSON.stringify({
      type: 'auth',
      token: this.authToken,
    }));
  }
  
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('[WebSocketClient] Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    logger.info(`[WebSocketClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  private handleMessage(message: any): void {
    if (message.type === 'update' && message.channel) {
      const callbacks = this.subscriptions.get(message.channel);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(message.data);
          } catch (error) {
            logger.error('[WebSocketClient] Callback error:', error);
          }
        });
      }
    }
  }
  
  subscribe(channel: string, callback: (data: any) => void): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      this.sendSubscribe(channel);
    }
    
    this.subscriptions.get(channel)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(channel);
      if (callbacks) {
        callbacks.delete(callback);
        
        if (callbacks.size === 0) {
          this.subscriptions.delete(channel);
          this.sendUnsubscribe(channel);
        }
      }
    };
  }
  
  private sendSubscribe(channel: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channel,
      }));
    }
  }
  
  private sendUnsubscribe(channel: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        channel,
      }));
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.subscriptions.clear();
  }
}
