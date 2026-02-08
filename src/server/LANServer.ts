/**
 * LAN Server for Networked Mode
 * 
 * A lightweight server for small school LAN deployments.
 * Provides REST API and WebSocket for real-time collaboration.
 * 
 * Features:
 * - SQLite database with shared access
 * - REST API for CRUD operations
 * - WebSocket for real-time updates
 * - Auto-discovery via mDNS/Bonjour
 * - File-based locking for SQLite
 * 
 * Usage:
 *   const server = new LANServer({ dataDir: './data', port: 3000 });
 *   await server.start();
 */

import type { Server as HTTPServer } from 'http';
import type { Application, Request, Response, NextFunction } from 'express';

interface LANServerConfig {
  dataDir: string;
  port: number;
  host?: string;
  enableCors?: boolean;
  auth?: {
    enabled: boolean;
    secret?: string;
  };
}

interface ServerState {
  running: boolean;
  clients: Map<string, WebSocketClient>;
  startTime: Date | null;
}

interface WebSocketClient {
  id: string;
  socket: any;
  subscriptions: Set<string>;
  lastPing: number;
}

export class LANServer {
  private config: LANServerConfig;
  private app: Application | null = null;
  private httpServer: HTTPServer | null = null;
  private wss: any = null;
  private state: ServerState = {
    running: false,
    clients: new Map(),
    startTime: null
  };
  private db: any = null;
  private bonjour: any = null;

  constructor(config: Partial<LANServerConfig> = {}) {
    this.config = {
      dataDir: './data',
      port: 3000,
      host: '0.0.0.0',
      enableCors: true,
      auth: { enabled: false },
      ...config
    };
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (this.state.running) {
      console.log('Server already running');
      return;
    }

    try {
      // Dynamically import dependencies
      const [{ default: express }, { createServer }, { default: betterSQLite3 }, { Server: WebSocketServer }] = await Promise.all([
        import('express'),
        import('http'),
        import('better-sqlite3'),
        import('ws')
      ]);

      // Initialize database
      this.db = betterSQLite3(`${this.config.dataDir}/schoolpilot.db`);
      this.initializeDatabase();

      // Create Express app
      this.app = express();
      this.setupMiddleware(express);
      this.setupRoutes();

      // Create HTTP server
      this.httpServer = createServer(this.app);

      // Setup WebSocket server
      this.wss = new WebSocketServer({ server: this.httpServer });
      this.setupWebSocket();

      // Start listening
      await new Promise<void>((resolve, reject) => {
        this.httpServer!.listen(this.config.port, this.config.host!, () => {
          console.log(`🚀 LAN Server running on http://${this.config.host}:${this.config.port}`);
          resolve();
        });

        this.httpServer!.on('error', reject);
      });

      // Setup auto-discovery
      await this.setupDiscovery();

      this.state.running = true;
      this.state.startTime = new Date();

      console.log('✅ LAN Server started successfully');
    } catch (error) {
      console.error('❌ Failed to start LAN Server:', error);
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.state.running) return;

    console.log('Stopping LAN Server...');

    // Stop discovery
    if (this.bonjour) {
      this.bonjour.destroy();
    }

    // Close all WebSocket connections
    for (const client of this.state.clients.values()) {
      client.socket.close();
    }
    this.state.clients.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
    }

    // Close database
    if (this.db) {
      this.db.close();
    }

    this.state.running = false;
    console.log('⏹️ LAN Server stopped');
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      running: this.state.running,
      port: this.config.port,
      clientCount: this.state.clients.size,
      uptime: this.state.startTime 
        ? Date.now() - this.state.startTime.getTime()
        : 0
    };
  }

  // ==================== Private Methods ====================

  private setupMiddleware(express: any): void {
    // JSON parsing
    this.app!.use(express.json({ limit: '10mb' }));

    // CORS
    if (this.config.enableCors) {
      this.app!.use((req: Request, res: Response, next: NextFunction) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });
    }

    // Logging
    this.app!.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app!.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        clients: this.state.clients.size
      });
    });

    // API Routes
    const apiRouter = this.createAPIRouter();
    this.app!.use('/api', apiRouter);

    // 404 handler
    this.app!.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app!.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Server error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  private createAPIRouter(): any {
    const express = require('express');
    const router = express.Router();

    // Get all collections
    router.get('/collections', (req: Request, res: Response) => {
      const tables = this.db!
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_%'")
        .all();
      res.json(tables.map((t: any) => t.name));
    });

    // Query collection
    router.get('/:collection', (req: Request, res: Response) => {
      try {
        const { collection } = req.params;
        const { filter, sort, page = '1', pageSize = '50' } = req.query;

        let sql = `SELECT * FROM ${this.escapeIdentifier(collection)}`;
        const params: any[] = [];

        // Apply filter
        if (filter) {
          const filterObj = JSON.parse(filter as string);
          const conditions = Object.entries(filterObj).map(([key, value]) => {
            params.push(value);
            return `${this.escapeIdentifier(key)} = ?`;
          });
          if (conditions.length > 0) {
            sql += ` WHERE ${conditions.join(' AND ')}`;
          }
        }

        // Apply sort
        if (sort) {
          const sortObj = JSON.parse(sort as string);
          const orderBy = Object.entries(sortObj)
            .map(([key, dir]) => `${this.escapeIdentifier(key)} ${dir}`)
            .join(', ');
          sql += ` ORDER BY ${orderBy}`;
        }

        // Apply pagination
        const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
        sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

        const stmt = this.db!.prepare(sql);
        const rows = stmt.all(...params);

        // Get total count
        const countSql = `SELECT COUNT(*) as count FROM ${this.escapeIdentifier(collection)}`;
        const countResult = this.db!.prepare(countSql).get();

        res.json({
          data: rows.map(r => this.transformRow(r)),
          pagination: {
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
            totalCount: countResult.count,
            totalPages: Math.ceil(countResult.count / parseInt(pageSize as string))
          }
        });
      } catch (error) {
        console.error('Query error:', error);
        res.status(500).json({ error: 'Query failed' });
      }
    });

    // Get single record
    router.get('/:collection/:id', (req: Request, res: Response) => {
      try {
        const { collection, id } = req.params;
        const sql = `SELECT * FROM ${this.escapeIdentifier(collection)} WHERE id = ?`;
        const row = this.db!.prepare(sql).get(id);

        if (!row) {
          res.status(404).json({ error: 'Not found' });
        } else {
          res.json(this.transformRow(row));
        }
      } catch (error) {
        console.error('Get error:', error);
        res.status(500).json({ error: 'Get failed' });
      }
    });

    // Create record
    router.post('/:collection', (req: Request, res: Response) => {
      try {
        const { collection } = req.params;
        const data = req.body;

        const id = data.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();

        const record = {
          ...data,
          id,
          created_at: timestamp,
          updated_at: timestamp
        };

        const columns = Object.keys(record);
        const placeholders = columns.map(() => '?').join(',');
        const values = Object.values(record);

        const sql = `INSERT INTO ${this.escapeIdentifier(collection)} (${columns.map(c => this.escapeIdentifier(c)).join(',')}) VALUES (${placeholders})`;
        this.db!.prepare(sql).run(...values);

        // Broadcast change to all clients
        this.broadcastChange(collection, 'create', id, record);

        res.status(201).json(record);
      } catch (error) {
        console.error('Create error:', error);
        res.status(500).json({ error: 'Create failed' });
      }
    });

    // Update record
    router.put('/:collection/:id', (req: Request, res: Response) => {
      try {
        const { collection, id } = req.params;
        const data = req.body;

        const timestamp = new Date().toISOString();
        const updates = { ...data, updated_at: timestamp };

        const sets = Object.keys(updates)
          .filter(key => key !== 'id')
          .map(key => `${this.escapeIdentifier(key)} = ?`)
          .join(', ');

        const values = [...Object.values(updates), id];

        const sql = `UPDATE ${this.escapeIdentifier(collection)} SET ${sets} WHERE id = ?`;
        const result = this.db!.prepare(sql).run(...values);

        if (result.changes === 0) {
          res.status(404).json({ error: 'Not found' });
          return;
        }

        // Get updated record
        const selectSql = `SELECT * FROM ${this.escapeIdentifier(collection)} WHERE id = ?`;
        const record = this.db!.prepare(selectSql).get(id);

        // Broadcast change
        this.broadcastChange(collection, 'update', id, record);

        res.json(this.transformRow(record));
      } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ error: 'Update failed' });
      }
    });

    // Delete record
    router.delete('/:collection/:id', (req: Request, res: Response) => {
      try {
        const { collection, id } = req.params;

        const sql = `DELETE FROM ${this.escapeIdentifier(collection)} WHERE id = ?`;
        const result = this.db!.prepare(sql).run(id);

        if (result.changes === 0) {
          res.status(404).json({ error: 'Not found' });
          return;
        }

        // Broadcast change
        this.broadcastChange(collection, 'delete', id, null);

        res.sendStatus(204);
      } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Delete failed' });
      }
    });

    return router;
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: any, req: any) => {
      const clientId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`Client connected: ${clientId}`);

      const client: WebSocketClient = {
        id: clientId,
        socket: ws,
        subscriptions: new Set(),
        lastPing: Date.now()
      };

      this.state.clients.set(clientId, client);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      }));

      // Handle messages
      ws.on('message', (message: any) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleWebSocketMessage(client, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        this.state.clients.delete(clientId);
      });

      // Handle errors
      ws.on('error', (error: any) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });
    });
  }

  private handleWebSocketMessage(client: WebSocketClient, data: any): void {
    switch (data.type) {
      case 'subscribe':
        // Subscribe to collection changes
        if (data.collection) {
          client.subscriptions.add(data.collection);
          console.log(`Client ${client.id} subscribed to ${data.collection}`);
        }
        break;

      case 'unsubscribe':
        // Unsubscribe from collection changes
        if (data.collection) {
          client.subscriptions.delete(data.collection);
          console.log(`Client ${client.id} unsubscribed from ${data.collection}`);
        }
        break;

      case 'ping':
        // Update last ping time
        client.lastPing = Date.now();
        client.socket.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        console.log(`Unknown message type from client ${client.id}:`, data.type);
    }
  }

  private broadcastChange(collection: string, operation: string, id: string, data: any): void {
    const message = JSON.stringify({
      type: 'change',
      collection,
      operation,
      id,
      data,
      timestamp: new Date().toISOString()
    });

    for (const client of this.state.clients.values()) {
      if (client.subscriptions.has(collection) || client.subscriptions.has('*')) {
        try {
          client.socket.send(message);
        } catch (error) {
          console.error(`Failed to send to client ${client.id}:`, error);
        }
      }
    }
  }

  private async setupDiscovery(): Promise<void> {
    try {
      const { default: bonjour } = await import('bonjour');
      this.bonjour = bonjour();

      // Advertise service
      this.bonjour.publish({
        name: 'SchoolPilot Server',
        type: 'schoolpilot',
        port: this.config.port,
        txt: {
          version: '1.0.0',
          timestamp: Date.now().toString()
        }
      });

      console.log('📢 Server advertised via mDNS/Bonjour');
    } catch (error) {
      console.warn('mDNS/Bonjour not available:', error);
    }
  }

  private initializeDatabase(): void {
    // Create metadata table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
      )
    `);

    // Insert server info
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO _metadata (key, value, updated_at)
      VALUES ('server_version', '1.0.0', ?)
    `);
    stmt.run(new Date().toISOString());
  }

  private escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  private transformRow(row: any): any {
    const result: any = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = value;
    }
    return result;
  }
}

export default LANServer;
