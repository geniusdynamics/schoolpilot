# Database Provider Selection Guide

## Overview

SchoolPilot3 supports multiple database providers to accommodate different deployment scenarios. This guide helps you select the right provider for your use case.

## Provider Comparison Matrix

| Provider | Best For | Sync Support | Offline | Performance | Setup Complexity |
|----------|----------|--------------|---------|-------------|------------------|
| **SQLite WASM** | Single-app, offline-first | ❌ | ✅ | ⭐⭐⭐⭐⭐ | Low |
| **SQLite File** | Development only | ❌ | ✅ | ⭐⭐⭐⭐ | Low |
| **PouchDB** | LAN multi-user | ✅ CouchDB | ✅ | ⭐⭐⭐ | Medium |
| **RxDB** | Complex reactive apps | ✅ CouchDB | ✅ | ⭐⭐⭐ | Medium |
| **Backend API** | Cloud-only | ✅ | ❌ | ⭐⭐ | Low |
| **LiveStore** | Future sync | ✅ | ✅ | ⭐⭐⭐⭐ | Medium |

## Selection Flowchart

```
START
  │
  ├─► Is this a single-computer deployment?
  │     │
  │     ├─► YES: Is performance critical?
  │     │     │
  │     │     ├─► YES: Use SQLite WASM (sqlite-wasm)
  │     │     │
  │     │     └─► NO: Use SQLite File (sqlite-file) for dev,
  │     │            SQLite WASM for prod
  │     │
  │     └─► NO: Continue below
  │
  ├─► Do you need multi-user sync over LAN?
  │     │
  │     ├─► YES: Use PouchDB with CouchDB backend
  │     │
  │     └─► NO: Continue below
  │
  └─► Do you need cloud sync?
        │
        ├─► YES: Use Backend API (erpnext or custom)
        │
        └─► HYBRID: Use PouchDB + Backend API
```

## Detailed Provider Documentation

### SQLite WASM (`sqlite-wasm`) ⭐ RECOMMENDED for Single-App

**Use when:**
- Single-user or single-device deployment
- Offline-first capability is required
- Maximum performance is needed
- No network synchronization required

**Configuration:**
```bash
REACT_APP_DATABASE_PROVIDER=sqlite
REACT_APP_DATABASE_AUTO_DETECT=false
```

**Pros:**
- Fastest performance (runs in browser)
- Full offline support
- No server dependencies
- Data persists in OPFS (Origin Private File System)

**Cons:**
- No multi-user sync
- Browser storage limits apply
- Limited to single device

---

### PouchDB (`pouchdb`)

**Use when:**
- Multi-user deployment over local network
- Need offline-first with sync
- Have a CouchDB server available

**Configuration:**
```bash
REACT_APP_DATABASE_PROVIDER=pouchdb
REACT_APP_DATABASE_URL=http://localhost:5984  # Your CouchDB URL
REACT_APP_DATABASE_NAME=schoolpilot
```

**Pros:**
- Built-in sync with CouchDB
- Offline-first with automatic sync
- Multi-user support
- Conflict resolution built-in

**Cons:**
- Requires CouchDB server
- Slower than SQLite
- More complex setup

---

### RxDB (`rxdb`)

**Use when:**
- Complex reactive data requirements
- Need real-time subscriptions
- Using CouchDB backend

**Configuration:**
```bash
REACT_APP_DATABASE_PROVIDER=rxdb
REACT_APP_DATABASE_URL=http://localhost:5984
```

**Pros:**
- Real-time reactive subscriptions
- Schema-based with migrations
- Built-in sync
- Good performance

**Cons:**
- Larger bundle size
- More complex than PouchDB
- Steeper learning curve

---

### Backend API (`backend-api`)

**Use when:**
- Cloud-only deployment (no local data)
- Using ERPNext or custom backend
- Always-online is acceptable

**Configuration:**
```bash
REACT_APP_DATABASE_PROVIDER=backend-api
REACT_APP_DATABASE_API_BASE_URL=https://your-api.com
REACT_APP_DATABASE_API_KEY=your-api-key
```

**Pros:**
- Centralized data management
- No local storage limits
- Easy backup/restore
- Works with existing systems

**Cons:**
- Requires internet connection
- No offline capability
- Dependent on server uptime

---

### LiveStore (`livestore`)

**Use when:**
- Future-proofing for sync
- Need SQLite performance with sync capability

**Status:** Currently under development

---

## Environment-Based Defaults

The system automatically selects providers based on your environment:

| Environment | Default Provider | Reason |
|-------------|------------------|--------|
| `development` | `sqlite-file` | Fast, persistent, easy debugging |
| `demo` | `pouchdb` | Demo mode with mock data |
| `production` | `sqlite-wasm` | Best performance, offline-first |

## Provider Selection API

The `DatabaseProviderFactory` handles automatic selection:

```typescript
import { getDatabaseProviderFactory } from './services/database/DatabaseProviderFactory';

const factory = getDatabaseProviderFactory();

// Get available providers
const available = factory.getAvailableProviderTypes();

// Select based on requirements
const provider = factory.selectProvider({
  requiresOffline: true,
  requiresSync: false,
  performanceLevel: 'high'
});
```

## Manual Override

To force a specific provider, set environment variables before startup:

```bash
# Force SQLite WASM regardless of environment
REACT_APP_DATABASE_PROVIDER=sqlite-wasm
REACT_APP_DATABASE_AUTO_DETECT=false
```

## Troubleshooting

### Provider Not Available

If a selected provider isn't available, the system automatically falls back:

1. Requested provider
2. `pouchdb`
3. `rxdb`
4. `backend-api`
5. `sqlite-wasm`

### Sync Not Working

1. Verify CouchDB is running
2. Check `REACT_APP_DATABASE_URL` is correct
3. Ensure CORS is configured on CouchDB
4. Check network connectivity

### Performance Issues

1. **SQLite**: Check OPFS access in browser
2. **PouchDB**: Verify replication isn't stuck
3. **RxDB**: Check for too many subscriptions

## Migration Between Providers

Moving data between providers is not automatic. Export your data first:

```typescript
// Export from current provider
const data = await currentProvider.exportAll();

// Import to new provider
await newProvider.importAll(data);
```

## Summary Recommendations

| Scenario | Recommended Provider |
|---------|-------------------|
| Solo teacher, single computer | SQLite WASM |
| Small school, shared server | PouchDB + CouchDB |
| Large school, IT infrastructure | PouchDB + CouchDB |
| Cloud-only access | Backend API |
| Multi-site with offline | PouchDB + Backend API |
| ERPNext integration | Backend API |
