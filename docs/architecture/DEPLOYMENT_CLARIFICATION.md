# SchoolPilot3 Deployment Architecture Clarification

## Core Principle

**SchoolPilot3 is ALWAYS single-tenant.** Each deployed instance serves exactly one school.

It can CONNECT to various backends, some of which may be multi-tenant.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SchoolPilot3 (Frontend)                      │
│                     ┌──────────────────┐                        │
│                     │  Single School   │  ← One instance =      │
│                     │  (Your School)   │    One school          │
│                     └────────┬─────────┘                        │
│                              │                                  │
│  ┌───────────────────────────┼───────────────────────────┐     │
│  │                           │                           │     │
│  ▼                           ▼                           ▼     │
│ ┌────────────┐    ┌─────────────────┐    ┌──────────────────┐ │
│ │  SQLite    │    │  Backend API    │    │  PouchDB/CouchDB │ │
│ │  (Local)   │    │  (External)     │    │  (External)      │ │
│ │            │    │                 │    │                  │ │
│ │ Standalone │    │ Could be        │    │ Could be         │ │
│ │ Mode       │    │ multi-tenant    │    │ multi-tenant     │ │
│ └────────────┘    │ backend service │    │ backend service  │ │
│                   └─────────────────┘    └──────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deployment Modes (Corrected)

| Mode | Data Storage | Backend | Use Case |
|------|--------------|---------|----------|
| **Standalone** | SQLite (Local) | None | Single laptop, no server |
| **Networked** | SQLite (Shared) | LAN Server | Small school, local network |
| **Hosted** | PostgreSQL | Self-hosted backend | School with IT staff |
| **SaaS Connect** | PouchDB | External SaaS backend | School uses SaaS service |
| **ERPNext** | SQLite/PouchDB | ERPNext instance | School with ERPNext |
| **Demo** | In-memory | Mock | Testing/development |

---

## Key Distinction

### What SchoolPilot3 IS:
- ✅ Single-tenant desktop/web app
- ✅ One instance per school
- ✅ Can work completely offline
- ✅ Can sync TO external backends
- ✅ Companion app to backend systems

### What SchoolPilot3 is NOT:
- ❌ Multi-tenant SaaS platform
- ❌ Backend service for multiple schools
- ❌ Shared hosting platform

---

## Backend Connection Examples

### Example 1: Standalone (No Backend)
```
SchoolPilot3 App → SQLite (local file)
                   └── No network needed
```

### Example 2: Connect to SaaS Backend
```
SchoolPilot3 App → HTTP API → SaaS Backend (multi-tenant)
  (School A)                    ├── Tenant: School A
                                ├── Tenant: School B
                                └── Tenant: School C
```

### Example 3: Connect to ERPNext
```
SchoolPilot3 App → HTTP API → ERPNext Instance
  (School A)                    └── Single school ERP
```

### Example 4: Networked Mode
```
SchoolPilot3 App → WebSocket → LAN Server
  (Computer 1)                   └── SQLite (shared file)
SchoolPilot3 App → WebSocket → LAN Server
  (Computer 2)                   └── Same SQLite file
```

---

## Configuration Flow

```typescript
// Each SchoolPilot3 instance configures ONE backend
const config = {
  schoolId: 'school-a-uuid',     // This school's ID
  schoolName: 'Greenfield Academy', // This school's name
  
  backend: {
    type: 'saas-api',            // saas-api | erpnext | lan | none
    url: 'https://api.schoolpilot.io',
    auth: {
      apiKey: 'school-a-api-key',  // Authenticates this school
      secret: '...'
    }
  },
  
  // Local storage (always present)
  localStorage: {
    type: 'sqlite',
    filename: 'school-a-data.db'
  }
};
```

---

## Sync Behavior

### Offline-First (Always)
1. All data stored locally in SQLite/PouchDB
2. App works completely without backend
3. Background sync when connection available
4. Queue operations when offline

### Backend Sync (When Connected)
```
Local Change → Queue → Attempt Sync → Backend API
                       ↓
                  If Success: Mark synced
                  If Fail: Retry later
                  If Conflict: Resolve per policy
```

---

## Multi-School Scenario

If a school district wants to manage multiple schools:

**Option A: Separate Instances**
```
School A: school-a.schoolpilot.local  → SQLite A
School B: school-b.schoolpilot.local  → SQLite B
School C: school-c.schoolpilot.local  → SQLite C
```

**Option B: Connect to District SaaS**
```
School A: App → District SaaS → Tenant: School A
School B: App → District SaaS → Tenant: School B
School C: App → District SaaS → Tenant: School C
         ↑
    Same SaaS URL, different API keys
```

---

## Implementation Impact

### What We DON'T Build:
- ❌ Tenant management UI
- ❌ Subscription billing
- ❌ Multi-school admin dashboard
- ❌ Tenant isolation in database
- ❌ Sign-up/ onboarding flows

### What We DO Build:
- ✅ Backend connection configuration
- ✅ API client for external backends
- ✅ Sync engine (local ↔ backend)
- ✅ Offline queue management
- ✅ School profile/settings

---

## Summary

SchoolPilot3 = **Single-tenant client app**
- Always one school per instance
- Always works offline
- Optionally connects to backends
- Backends may be multi-tenant, but SchoolPilot3 isn't

Think of it like:
- **Outlook** (email client) connecting to **Exchange** (multi-tenant backend)
- **Slack desktop app** (single workspace) connecting to **Slack servers**
- **VS Code** (editor) connecting to **GitHub** (multi-tenant)

---

**Document Version:** 1.0
**Last Updated:** 2026-02-08
