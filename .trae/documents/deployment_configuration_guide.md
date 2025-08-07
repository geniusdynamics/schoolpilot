# Deployment and Configuration Guide: Dual-Database Architecture

## 1. Overview

This guide provides comprehensive instructions for deploying and configuring the Dual-Database Architecture with Enhanced Abstraction layer in production environments. The system uses IndexedDB as primary storage with SQLite backup (replacing deprecated WebSQL), supporting all 88 collections without reduction.

## 2. Environment Setup

### 2.1 Development Environment

**Prerequisites:**
- Node.js 18+ 
- npm or yarn
- Modern browser with IndexedDB support
- Git

**Setup Steps:**

```bash
# Clone repository
git clone <repository-url>
cd schoolpilot3

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Configure environment variables
# Edit .env.local with your settings

# Start development server
npm run dev
```

**Development Environment Variables:**

```bash
# .env.local
NODE_ENV=development
VITE_DATABASE_PROVIDER=pouchdb
VITE_DATABASE_NAME=schoolpilot_dev
VITE_DATABASE_DEBUG=true
VITE_DATABASE_AUTO_COMPACTION=true

# Storage Configuration
VITE_DATABASE_PRIMARY_STORAGE=indexeddb
VITE_DATABASE_BACKUP_STORAGE=sqlite
VITE_DATABASE_AUTO_BACKUP=true
VITE_DATABASE_BACKUP_INTERVAL=60000

# Optional: RxDB License for testing
VITE_RXDB_LICENSE_KEY=your_dev_license_key

# Development Features
VITE_ENABLE_DEVTOOLS=true
VITE_MOCK_DATA=false
```

### 2.2 Staging Environment

**Staging Configuration:**

```bash
# .env.staging
NODE_ENV=staging
VITE_DATABASE_PROVIDER=pouchdb
VITE_DATABASE_NAME=schoolpilot_staging
VITE_DATABASE_DEBUG=false
VITE_DATABASE_AUTO_COMPACTION=true

# Storage Configuration
VITE_DATABASE_PRIMARY_STORAGE=indexeddb
VITE_DATABASE_BACKUP_STORAGE=sqlite
VITE_DATABASE_AUTO_BACKUP=true
VITE_DATABASE_BACKUP_INTERVAL=300000

# Performance Settings
VITE_DATABASE_BATCH_SIZE=50
VITE_DATABASE_CACHE_SIZE=100
VITE_DATABASE_SYNC_INTERVAL=30000

# Security
VITE_ENABLE_AUDIT_LOGS=true
VITE_SESSION_TIMEOUT=3600000
```

### 2.3 Production Environment

**Production Configuration:**

```bash
# .env.production
NODE_ENV=production
VITE_DATABASE_PROVIDER=rxdb
VITE_DATABASE_NAME=schoolpilot_prod
VITE_DATABASE_DEBUG=false
VITE_DATABASE_AUTO_COMPACTION=true

# Storage Configuration (IndexedDB + SQLite Backup)
VITE_DATABASE_PRIMARY_STORAGE=indexeddb
VITE_DATABASE_BACKUP_STORAGE=sqlite
VITE_DATABASE_AUTO_BACKUP=true
VITE_DATABASE_BACKUP_INTERVAL=900000
VITE_DATABASE_BACKUP_RETENTION=30

# RxDB License (Required for production)
VITE_RXDB_LICENSE_KEY=your_production_license_key

# Performance Optimization
VITE_DATABASE_BATCH_SIZE=100
VITE_DATABASE_CACHE_SIZE=500
VITE_DATABASE_SYNC_INTERVAL=60000
VITE_DATABASE_COMPRESSION=true

# Security
VITE_ENABLE_AUDIT_LOGS=true
VITE_SESSION_TIMEOUT=1800000
VITE_ENABLE_ENCRYPTION=true

# Monitoring
VITE_ENABLE_ANALYTICS=true
VITE_ERROR_REPORTING=true
```

## 3. Build Configuration

### 3.1 Vite Configuration

**File: `vite.config.ts`**

```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      // Bundle analyzer for production
      mode === 'production' && visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true
      })
    ].filter(Boolean),
    
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@database': resolve(__dirname, 'src/services/database'),
        '@components': resolve(__dirname, 'src/components'),
        '@utils': resolve(__dirname, 'src/utils')
      }
    },
    
    define: {
      global: 'globalThis',
      __DATABASE_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
    },
    
    build: {
      target: 'es2020',
      sourcemap: mode !== 'production',
      minify: mode === 'production' ? 'terser' : false,
      
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate database providers into chunks
            'database-core': [
              'src/services/database/abstractions',
              'src/services/database/schemas'
            ],
            'database-pouchdb': [
              'pouchdb',
              'pouchdb-find',
              'src/services/database/providers/pouchdb'
            ],
            'database-rxdb': [
              'rxdb',
              'src/services/database/providers/rxdb'
            ],
            'vendor': ['react', 'react-dom', 'rxjs'],
            'utils': ['joi', 'uuid', 'lodash']
          }
        }
      },
      
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production'
        }
      }
    },
    
    optimizeDeps: {
      include: [
        'pouchdb',
        'pouchdb-find',
        'rxjs',
        'joi',
        'uuid',
        'lodash'
      ],
      exclude: [
        // Conditionally exclude RxDB if no license
        !env.VITE_RXDB_LICENSE_KEY && 'rxdb'
      ].filter(Boolean)
    },
    
    server: {
      port: 3000,
      host: true,
      fs: {
        strict: false
      }
    },
    
    preview: {
      port: 4173,
      host: true
    }
  };
});
```

### 3.2 TypeScript Configuration

**File: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@database/*": ["src/services/database/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    },
    "types": ["vite/client", "node"]
  },
  "include": [
    "src",
    "vite.config.ts"
  ],
  "references": [
    { "path": "./tsconfig.node.json" }
  ]
}
```

## 4. Docker Deployment

### 4.1 Dockerfile

**File: `Dockerfile`**

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 4.2 Nginx Configuration

**File: `nginx.conf`**

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; worker-src 'self' blob:;" always;
    
    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;
        
        # Enable browser caching for static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        # Security: Hide nginx version
        server_tokens off;
    }
}
```

### 4.3 Docker Compose

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  schoolpilot-app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/var/log/nginx
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
  # Optional: Monitoring with Prometheus
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    restart: unless-stopped
    
  # Optional: Grafana for visualization
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    restart: unless-stopped

volumes:
  grafana-storage:
```

## 5. Cloud Deployment

### 5.1 Vercel Deployment

**File: `vercel.json`**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "VITE_DATABASE_PROVIDER": "pouchdb",
    "VITE_DATABASE_NAME": "schoolpilot_prod"
  }
}
```

**Deployment Commands:**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add VITE_RXDB_LICENSE_KEY production
vercel env add VITE_DATABASE_PROVIDER production
```

### 5.2 Netlify Deployment

**File: `netlify.toml`**

```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_ENV = "production"
  VITE_DATABASE_PROVIDER = "pouchdb"
  VITE_DATABASE_NAME = "schoolpilot_prod"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 5.3 AWS S3 + CloudFront

**File: `deploy-aws.sh`**

```bash
#!/bin/bash

# Build application
npm run build

# Sync to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Set cache headers for assets
aws s3 cp s3://your-bucket-name/assets/ s3://your-bucket-name/assets/ \
  --recursive \
  --metadata-directive REPLACE \
  --cache-control "public, max-age=31536000, immutable"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"

echo "Deployment completed successfully!"
```

## 6. Security Configuration

### 6.1 Content Security Policy

**File: `src/utils/security.ts`**

```typescript
// ABOUTME: Security utilities for CSP and data protection
// ABOUTME: Implements security headers and data encryption for sensitive information

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", 'https:'],
  'worker-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"]
};

export function generateCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

// Data encryption for sensitive fields
export class DataEncryption {
  private static key: string = process.env.VITE_ENCRYPTION_KEY || 'default-key';
  
  static encrypt(data: string): string {
    // Implement encryption logic
    return btoa(data); // Simple base64 for demo
  }
  
  static decrypt(encryptedData: string): string {
    // Implement decryption logic
    return atob(encryptedData); // Simple base64 for demo
  }
}
```

### 6.2 Environment Variable Validation

**File: `src/config/envValidation.ts`**

```typescript
// ABOUTME: Environment variable validation and type safety
// ABOUTME: Ensures all required configuration is present and valid

import Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').required(),
  VITE_DATABASE_PROVIDER: Joi.string().valid('pouchdb', 'rxdb').required(),
  VITE_DATABASE_NAME: Joi.string().required(),
  VITE_DATABASE_DEBUG: Joi.boolean().default(false),
  VITE_RXDB_LICENSE_KEY: Joi.string().when('VITE_DATABASE_PROVIDER', {
    is: 'rxdb',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  VITE_ENABLE_AUDIT_LOGS: Joi.boolean().default(true),
  VITE_SESSION_TIMEOUT: Joi.number().default(1800000),
  VITE_DATABASE_BATCH_SIZE: Joi.number().default(50),
  VITE_DATABASE_CACHE_SIZE: Joi.number().default(100)
}).unknown();

export function validateEnvironment(): void {
  const { error, value } = envSchema.validate(import.meta.env);
  
  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }
  
  console.log('✅ Environment validation passed');
  return value;
}

// Type-safe environment access
export const env = {
  NODE_ENV: import.meta.env.NODE_ENV as 'development' | 'staging' | 'production',
  DATABASE_PROVIDER: import.meta.env.VITE_DATABASE_PROVIDER as 'pouchdb' | 'rxdb',
  DATABASE_NAME: import.meta.env.VITE_DATABASE_NAME as string,
  DATABASE_DEBUG: import.meta.env.VITE_DATABASE_DEBUG === 'true',
  RXDB_LICENSE_KEY: import.meta.env.VITE_RXDB_LICENSE_KEY as string,
  ENABLE_AUDIT_LOGS: import.meta.env.VITE_ENABLE_AUDIT_LOGS !== 'false',
  SESSION_TIMEOUT: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '1800000'),
  DATABASE_BATCH_SIZE: parseInt(import.meta.env.VITE_DATABASE_BATCH_SIZE || '50'),
  DATABASE_CACHE_SIZE: parseInt(import.meta.env.VITE_DATABASE_CACHE_SIZE || '100')
};
```

## 7. Monitoring and Logging

### 7.1 Application Monitoring

**File: `src/services/monitoring/ApplicationMonitor.ts`**

```typescript
// ABOUTME: Application monitoring and performance tracking
// ABOUTME: Collects metrics, errors, and performance data for operational insights

import { databaseService } from '../database/DatabaseService';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface ErrorEvent {
  message: string;
  stack?: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export class ApplicationMonitor {
  private static instance: ApplicationMonitor;
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorEvent[] = [];
  private isEnabled: boolean = true;
  
  static getInstance(): ApplicationMonitor {
    if (!this.instance) {
      this.instance = new ApplicationMonitor();
    }
    return this.instance;
  }
  
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.isEnabled) return;
    
    this.metrics.push({
      name,
      value,
      timestamp: new Date(),
      tags
    });
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }
  
  recordError(error: Error, context?: Record<string, any>): void {
    if (!this.isEnabled) return;
    
    this.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      context
    });
    
    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }
    
    // Log to console in development
    if (import.meta.env.NODE_ENV === 'development') {
      console.error('Application Error:', error, context);
    }
  }
  
  async collectSystemMetrics(): Promise<void> {
    try {
      // Database metrics
      const dbStatus = databaseService.getStatus();
      this.recordMetric('database.collections.count', dbStatus.collectionCount);
      this.recordMetric('database.initialized', dbStatus.isInitialized ? 1 : 0);
      
      // Memory usage (if available)
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        this.recordMetric('memory.used', memInfo.usedJSHeapSize);
        this.recordMetric('memory.total', memInfo.totalJSHeapSize);
        this.recordMetric('memory.limit', memInfo.jsHeapSizeLimit);
      }
      
      // Performance timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.recordMetric('page.load.time', navigation.loadEventEnd - navigation.loadEventStart);
        this.recordMetric('page.dom.ready', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
      }
      
    } catch (error) {
      this.recordError(error as Error, { context: 'collectSystemMetrics' });
    }
  }
  
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
  
  getErrors(): ErrorEvent[] {
    return [...this.errors];
  }
  
  getHealthStatus(): { status: 'healthy' | 'degraded' | 'unhealthy'; details: Record<string, any> } {
    const dbStatus = databaseService.getStatus();
    const recentErrors = this.errors.filter(e => 
      Date.now() - e.timestamp.getTime() < 300000 // Last 5 minutes
    );
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!dbStatus.isInitialized) {
      status = 'unhealthy';
    } else if (recentErrors.length > 5) {
      status = 'degraded';
    }
    
    return {
      status,
      details: {
        database: dbStatus,
        errorCount: recentErrors.length,
        metricsCount: this.metrics.length,
        lastUpdated: new Date()
      }
    };
  }
  
  enable(): void {
    this.isEnabled = true;
  }
  
  disable(): void {
    this.isEnabled = false;
  }
  
  clear(): void {
    this.metrics = [];
    this.errors = [];
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  ApplicationMonitor.getInstance().recordError(
    new Error(event.message),
    {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }
  );
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  ApplicationMonitor.getInstance().recordError(
    new Error(`Unhandled Promise Rejection: ${event.reason}`),
    { type: 'unhandledrejection' }
  );
});

// Export singleton
export const applicationMonitor = ApplicationMonitor.getInstance();
```

### 7.2 Database Performance Monitoring

**File: `src/services/database/monitoring/DatabaseMonitor.ts`**

```typescript
// ABOUTME: Database-specific monitoring and performance tracking
// ABOUTME: Tracks query performance, collection usage, and database health

import { Observable, interval } from 'rxjs';
import { databaseService } from '../DatabaseService';
import { applicationMonitor } from '../../monitoring/ApplicationMonitor';

interface QueryMetric {
  collection: string;
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

interface CollectionMetric {
  name: string;
  documentCount: number;
  queryCount: number;
  avgQueryTime: number;
  lastAccessed: Date;
}

export class DatabaseMonitor {
  private static instance: DatabaseMonitor;
  private queryMetrics: QueryMetric[] = [];
  private collectionMetrics: Map<string, CollectionMetric> = new Map();
  private monitoringInterval: any;
  
  static getInstance(): DatabaseMonitor {
    if (!this.instance) {
      this.instance = new DatabaseMonitor();
    }
    return this.instance;
  }
  
  startMonitoring(): void {
    // Collect metrics every 30 seconds
    this.monitoringInterval = interval(30000).subscribe(() => {
      this.collectMetrics();
    });
  }
  
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      this.monitoringInterval.unsubscribe();
    }
  }
  
  recordQuery(
    collection: string,
    operation: string,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    const metric: QueryMetric = {
      collection,
      operation,
      duration,
      timestamp: new Date(),
      success,
      error
    };
    
    this.queryMetrics.push(metric);
    
    // Keep only last 1000 queries
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }
    
    // Update collection metrics
    this.updateCollectionMetrics(collection, duration);
    
    // Record in application monitor
    applicationMonitor.recordMetric(
      `database.query.${operation}`,
      duration,
      { collection, success: success.toString() }
    );
    
    if (!success && error) {
      applicationMonitor.recordError(
        new Error(`Database query failed: ${error}`),
        { collection, operation }
      );
    }
  }
  
  private updateCollectionMetrics(collection: string, queryDuration: number): void {
    const existing = this.collectionMetrics.get(collection) || {
      name: collection,
      documentCount: 0,
      queryCount: 0,
      avgQueryTime: 0,
      lastAccessed: new Date()
    };
    
    existing.queryCount++;
    existing.avgQueryTime = (
      (existing.avgQueryTime * (existing.queryCount - 1)) + queryDuration
    ) / existing.queryCount;
    existing.lastAccessed = new Date();
    
    this.collectionMetrics.set(collection, existing);
  }
  
  private async collectMetrics(): Promise<void> {
    try {
      const collections = databaseService.getAllCollections();
      
      for (const [name, collection] of collections) {
        try {
          const stats = await collection.getStats();
          const existing = this.collectionMetrics.get(name) || {
            name,
            documentCount: 0,
            queryCount: 0,
            avgQueryTime: 0,
            lastAccessed: new Date()
          };
          
          existing.documentCount = stats.documentCount;
          this.collectionMetrics.set(name, existing);
          
          // Record metrics
          applicationMonitor.recordMetric(
            'database.collection.documents',
            stats.documentCount,
            { collection: name }
          );
          
          applicationMonitor.recordMetric(
            'database.collection.indexes',
            stats.indexCount,
            { collection: name }
          );
          
        } catch (error) {
          applicationMonitor.recordError(
            error as Error,
            { context: 'collectCollectionMetrics', collection: name }
          );
        }
      }
      
    } catch (error) {
      applicationMonitor.recordError(
        error as Error,
        { context: 'collectDatabaseMetrics' }
      );
    }
  }
  
  getQueryMetrics(): QueryMetric[] {
    return [...this.queryMetrics];
  }
  
  getCollectionMetrics(): CollectionMetric[] {
    return Array.from(this.collectionMetrics.values());
  }
  
  getSlowQueries(thresholdMs: number = 1000): QueryMetric[] {
    return this.queryMetrics.filter(metric => metric.duration > thresholdMs);
  }
  
  getFailedQueries(): QueryMetric[] {
    return this.queryMetrics.filter(metric => !metric.success);
  }
  
  getPerformanceReport(): {
    totalQueries: number;
    avgQueryTime: number;
    slowQueries: number;
    failedQueries: number;
    collections: CollectionMetric[];
  } {
    const totalQueries = this.queryMetrics.length;
    const avgQueryTime = totalQueries > 0 
      ? this.queryMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries
      : 0;
    const slowQueries = this.getSlowQueries().length;
    const failedQueries = this.getFailedQueries().length;
    
    return {
      totalQueries,
      avgQueryTime,
      slowQueries,
      failedQueries,
      collections: this.getCollectionMetrics()
    };
  }
}

// Export singleton
export const databaseMonitor = DatabaseMonitor.getInstance();
```

## 8. Operational Procedures

### 8.1 Deployment Checklist

**Pre-Deployment:**
- [ ] Run all tests (`npm run test`)
- [ ] Build application (`npm run build`)
- [ ] Verify environment variables
- [ ] Check database provider availability
- [ ] Validate RxDB license (if using)
- [ ] Review security headers
- [ ] Test backup/restore procedures

**Deployment:**
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Verify database initialization
- [ ] Check monitoring dashboards
- [ ] Test provider switching (if applicable)
- [ ] Deploy to production
- [ ] Monitor for errors

**Post-Deployment:**
- [ ] Verify application health
- [ ] Check performance metrics
- [ ] Monitor error rates
- [ ] Validate user functionality
- [ ] Update documentation

### 8.2 Backup and Recovery

**Automated Backup Script:**

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/schoolpilot_backup_${TIMESTAMP}.json"

# Create backup directory
mkdir -p $BACKUP_DIR

# Export database
node -e "
  import('./src/services/database/DatabaseService.js').then(async ({ databaseService }) => {
    await databaseService.initialize();
    const backup = await databaseService.backup();
    require('fs').writeFileSync('$BACKUP_FILE', JSON.stringify(backup, null, 2));
    console.log('Backup created: $BACKUP_FILE');
    process.exit(0);
  }).catch(console.error);
"

# Compress backup
gzip $BACKUP_FILE

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

**Recovery Script:**

```bash
#!/bin/bash
# restore-database.sh

if [ -z "$1" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

BACKUP_FILE=$1

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE > temp_backup.json
  BACKUP_FILE=temp_backup.json
fi

# Restore database
node -e "
  import('./src/services/database/DatabaseService.js').then(async ({ databaseService }) => {
    await databaseService.initialize();
    const backup = JSON.parse(require('fs').readFileSync('$BACKUP_FILE', 'utf8'));
    await databaseService.restore(backup);
    console.log('Database restored successfully');
    process.exit(0);
  }).catch(console.error);
"

# Clean up temp file
if [ -f temp_backup.json ]; then
  rm temp_backup.json
fi

echo "Database restored from: $BACKUP_FILE"
```

### 8.3 Health Checks

**File: `src/utils/healthCheck.ts`**

```typescript
// ABOUTME: Health check utilities for monitoring application status
// ABOUTME: Provides endpoints and functions for operational health monitoring

import { databaseService } from '../services/database/DatabaseService';
import { applicationMonitor } from '../services/monitoring/ApplicationMonitor';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    database: HealthCheck;
    memory: HealthCheck;
    performance: HealthCheck;
  };
  details?: Record<string, any>;
}

interface HealthCheck {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  duration?: number;
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const checks = {
    database: await checkDatabase(),
    memory: checkMemory(),
    performance: checkPerformance()
  };
  
  const overallStatus = determineOverallStatus(checks);
  
  return {
    status: overallStatus,
    timestamp: new Date(),
    checks,
    details: {
      duration: Date.now() - startTime,
      version: __DATABASE_VERSION__
    }
  };
}

async function checkDatabase(): Promise<HealthCheck> {
  try {
    const isHealthy = await databaseService.healthCheck();
    const status = databaseService.getStatus();
    
    if (!isHealthy || !status.isInitialized) {
      return {
        status: 'fail',
        message: 'Database is not available or not initialized'
      };
    }
    
    if (status.lastError) {
      return {
        status: 'warn',
        message: `Database has recent errors: ${status.lastError.message}`
      };
    }
    
    return {
      status: 'pass',
      message: `Database is healthy (${status.currentProvider}, ${status.collectionCount} collections)`
    };
    
  } catch (error) {
    return {
      status: 'fail',
      message: `Database check failed: ${(error as Error).message}`
    };
  }
}

function checkMemory(): HealthCheck {
  if ('memory' in performance) {
    const memInfo = (performance as any).memory;
    const usedMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
    const limitMB = Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024);
    const usagePercent = (usedMB / limitMB) * 100;
    
    if (usagePercent > 90) {
      return {
        status: 'fail',
        message: `Memory usage critical: ${usedMB}MB (${usagePercent.toFixed(1)}%)`
      };
    }
    
    if (usagePercent > 75) {
      return {
        status: 'warn',
        message: `Memory usage high: ${usedMB}MB (${usagePercent.toFixed(1)}%)`
      };
    }
    
    return {
      status: 'pass',
      message: `Memory usage normal: ${usedMB}MB (${usagePercent.toFixed(1)}%)`
    };
  }
  
  return {
    status: 'pass',
    message: 'Memory information not available'
  };
}

function checkPerformance(): HealthCheck {
  const healthStatus = applicationMonitor.getHealthStatus();
  
  if (healthStatus.status === 'unhealthy') {
    return {
      status: 'fail',
      message: 'Application performance is unhealthy'
    };
  }
  
  if (healthStatus.status === 'degraded') {
    return {
      status: 'warn',
      message: 'Application performance is degraded'
    };
  }
  
  return {
    status: 'pass',
    message: 'Application performance is healthy'
  };
}

function determineOverallStatus(checks: Record<string, HealthCheck>): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map(check => check.status);
  
  if (statuses.includes('fail')) {
    return 'unhealthy';
  }
  
  if (statuses.includes('warn')) {
    return 'degraded';
  }
  
  return 'healthy';
}

// Express.js health endpoint (if using server)
export function createHealthEndpoint() {
  return async (req: any, res: any) => {
    try {
      const result = await performHealthCheck();
      const statusCode = result.status === 'healthy' ? 200 : 
                        result.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(result);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date(),
        error: (error as Error).message
      });
    }
  };
}
```

This deployment and configuration guide provides comprehensive instructions for setting up, deploying, and maintaining the Enhanced Abstraction layer in production environments. Follow these guidelines to ensure a secure, performant, and reliable deployment.
