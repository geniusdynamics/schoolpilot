# SchoolPilot3 Configuration Reference
## Complete Configuration Guide

**Document Version:** 1.0.0  
**Date:** February 17, 2026

---

# TABLE OF CONTENTS

1. [Introduction](#1-introduction)
2. [Environment Variables](#2-environment-variables)
3. [Application Configuration](#3-application-configuration)
4. [Database Configuration](#4-database-configuration)
5. [Authentication Configuration](#5-authentication-configuration)
6. [Security Configuration](#6-security-configuration)
7. [API Configuration](#7-api-configuration)
8. [Feature Flags](#8-feature-flags)
9. [Module Configuration](#9-module-configuration)
10. [Third-Party Integrations](#10-third-party-integrations)
11. [Configuration Examples](#11-configuration-examples)

---

# 1. INTRODUCTION

## 1.1 Configuration Architecture

The application uses a hierarchical configuration system:

```
Environment Variables (.env)
        ↓
Default Configuration (config/default.yaml)
        ↓
Environment Override (config/{environment}.yaml)
        ↓
Runtime Override (database config table)
```

## 1.2 Configuration Loading Priority

| Priority | Source | Description |
|----------|--------|-------------|
| 1 (highest) | Environment Variables | System environment |
| 2 | YAML Config | Environment-specific config |
| 3 | Database Config | Runtime overrides |
| 4 (lowest) | Default Values | Code defaults |

---

# 2. ENVIRONMENT VARIABLES

## 2.1 Required Variables

```bash
# =============================================================================
# SERVER CONFIGURATION
# =============================================================================

# Server
ENV=development                    # development, staging, production
SERVER_HOST=0.0.0.0              # Server bind address
SERVER_PORT=8080                  # Server port
APP_NAME=schoolpilot              # Application name
APP_VERSION=1.0.0                # Application version

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

# SurrealDB Connection
SURREALDB_HOST=localhost         # Database host
SURREALDB_PORT=8000              # Database port
SURREALDB_USER=root               # Database user
SURREALDB_PASS=root               # Database password
SURREALDB_NAMESPACE=schoolpilot  # Database namespace
SURREALDB_DATABASE=main          # Database name
SURREALDB_TIMEOUT=30s           # Connection timeout
SURREALDB_TIMEOUT_WRITE=60s      # Write timeout

# Database Connection Pool
DB_POOL_MIN_CONNECTIONS=5        # Minimum connections
DB_POOL_MAX_CONNECTIONS=50       # Maximum connections

# =============================================================================
# JWT AUTHENTICATION
# =============================================================================

JWT_SECRET_KEY=your-secret-key-here-min-32-chars
JWT_ACCESS_EXPIRY=15m             # Access token expiry (15 minutes)
JWT_REFRESH_EXPIRY=7d             # Refresh token expiry (7 days)
JWT_ISSUER=schoolpilot            # Token issuer
JWT_AUDIENCE=schoolpilot-api      # Token audience

# =============================================================================
# SECURITY
# =============================================================================

BCRYPT_COST=12                    # Password hashing cost (10-14)
SESSION_TIMEOUT=24h               # Session timeout
MAX_LOGIN_ATTEMPTS=5             # Max failed attempts before lockout
LOCKOUT_DURATION=30m              # Account lockout duration
PASSWORD_MIN_LENGTH=8             # Minimum password length
PASSWORD_REQUIRE_UPPERCASE=true   # Require uppercase
PASSWORD_REQUIRE_LOWERCASE=true   # Require lowercase
PASSWORD_REQUIRE_NUMBER=true      # Require number
PASSWORD_REQUIRE_SPECIAL=true     # Require special char
```

## 2.2 Optional Variables

```bash
# =============================================================================
# LOGGING
# =============================================================================

LOG_LEVEL=info                    # debug, info, warn, error
LOG_FORMAT=json                 # json, text
LOG_OUTPUT=stdout               # stdout, file
LOG_FILE_PATH=/var/log/schoolpilot/app.log
LOG_MAX_SIZE=100                # Max file size in MB
LOG_MAX_AGE=30                  # Max file age in days
LOG_MAX_BACKUPS=10               # Number of backup files

# =============================================================================
# RATE LIMITING
# =============================================================================

RATE_LIMIT_ENABLED=true          # Enable rate limiting
RATE_LIMIT_REQUESTS=100          # Requests per window
RATE_LIMIT_WINDOW=1m             # Time window
RATE_LIMIT_BURST=10               # Burst allowance

# =============================================================================
# CORS CONFIGURATION
# =============================================================================

CORS_ENABLED=true                 # Enable CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://app.schoolpilot.edu
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,PATCH,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Request-ID
CORS_EXPOSED_HEADERS=X-Total-Count,X-Page-Number
CORS_ALLOW_CREDENTIALS=true      # Allow cookies
CORS_MAX_AGE=86400              # Preflight cache duration (seconds)

# =============================================================================
# FILE STORAGE
# =============================================================================

STORAGE_TYPE=local               # local, s3, azure
STORAGE_PATH=/var/storage       # Local storage path
STORAGE_MAX_FILE_SIZE=10485760  # 10MB in bytes
STORAGE_ALLOWED_EXTENSIONS=jpg,jpeg,png,pdf,doc,docx

# S3 Storage (if using S3)
AWS_ACCESS_KEY_ID=               # AWS access key
AWS_SECRET_ACCESS_KEY=          # AWS secret key
AWS_REGION=af-south-1           # AWS region
AWS_S3_BUCKET=schoolpilot-files  # S3 bucket name

# =============================================================================
# CACHE CONFIGURATION
# =============================================================================

CACHE_ENABLED=true               # Enable caching
CACHE_TYPE=memory               # memory, redis
CACHE_TTL=300                   # Default cache TTL (seconds)
CACHE_PREFIX=sp:               # Cache key prefix

# Redis (if using Redis)
REDIS_HOST=localhost            # Redis host
REDIS_PORT=6379                  # Redis port
REDIS_PASSWORD=                  # Redis password
REDIS_DB=0                       # Redis database number
REDIS_TLS=false                 # Enable TLS

# =============================================================================
# EMAIL CONFIGURATION
# =============================================================================

EMAIL_ENABLED=false              # Enable email
EMAIL_DRIVER=smtp               # smtp, sendmail, ses
EMAIL_HOST=smtp.gmail.com       # SMTP host
EMAIL_PORT=587                  # SMTP port
EMAIL_USERNAME=                  # SMTP username
EMAIL_PASSWORD=                  # SMTP password
EMAIL_FROM=noreply@schoolpilot.edu
EMAIL_FROM_NAME=SchoolPilot
EMAIL_ENCRYPTION=tls            # tls, ssl

# =============================================================================
# SMS CONFIGURATION
# =============================================================================

SMS_ENABLED=false                # Enable SMS
SMS_DRIVER=twilio               # twilio, africa_talking
SMS_API_KEY=                     # SMS API key
SMS_API_SECRET=                 # SMS API secret
SMS_SENDER_ID=SCHOOLP           # Sender ID

# =============================================================================
# PAYMENT GATEWAY
# =============================================================================

PAYMENT_ENABLED=false           # Enable payments
PAYMENT_MPESA_ENABLED=false     # M-Pesa
PAYMENT_MPESA_CONSUMER_KEY=     # M-Pesa consumer key
PAYMENT_MPESA_CONSUMER_SECRET=  # M-Pesa secret
PAYMENT_MPESA_SHORTCODE=        # M-Pesa shortcode
PAYMENT_MPESA_PASSKEY=          # M-Pesa passkey

# =============================================================================
# MONITORING & OBSERVABILITY
# =============================================================================

SENTRY_ENABLED=false             # Enable Sentry
SENTRY_DSN=                      # Sentry DSN
SENTRY_ENVIRONMENT=production   # Environment
SENTRY_TRACES_SAMPLE_RATE=0.1   # Trace sample rate

METRICS_ENABLED=true            # Enable metrics
METRICS_PORT=9090               # Metrics port
METRICS_PATH=/metrics           # Metrics path

# =============================================================================
# BACKGROUND JOBS
# =============================================================================

QUEUE_ENABLED=true               # Enable job queue
QUEUE_DRIVER=memory              # memory, redis
QUEUE_CONCURRENCY=5              # Worker concurrency

# =============================================================================
# MAINTENANCE MODE
# =============================================================================

MAINTENANCE_MODE=false           # Enable maintenance mode
MAINTENANCE_ALLOWED_IPS=          # IPs allowed during maintenance

# =============================================================================
# MULTI-TENANT
# =============================================================================

MULTI_TENANT_ENABLED=false      # Enable multi-tenancy
TENANT_DEFAULT_SUBDOMAIN=schoolpilot
```

---

# 3. APPLICATION CONFIGURATION

## 3.1 config/default.yaml

```yaml
# =============================================================================
# APPLICATION
# =============================================================================

app:
  name: SchoolPilot
  version: 1.0.0
  description: School Management System
  debug: false
  env: development
  url: http://localhost:8080
  api_url: http://localhost:8080/api/v1
  frontend_url: http://localhost:5173

# =============================================================================
# SERVER
# =============================================================================

server:
  host: 0.0.0.0
  port: 8080
  read_timeout: 60s
  write_timeout: 60s
  idle_timeout: 120s
  max_header_bytes: 1048576

# =============================================================================
# TIMEZONE
# =============================================================================

timezone:
  default: Africa/Nairobi
  supported:
    - Africa/Nairobi
    - Africa/Lagos
    - Africa/Kampala
    - Africa/Dar_es_Salaam
    - UTC

# =============================================================================
# LOCALIZATION
# =============================================================================

i18n:
  default_locale: en
  supported_locales:
    - en
    - sw
  fallback_locale: en
  translation_path: ./locales
  auto_detect: true

# =============================================================================
# PAGINATION
# =============================================================================

pagination:
  default_page_size: 20
  max_page_size: 100
  page_parameter: page
  per_page_parameter: per_page

# =============================================================================
# SORTING
# =============================================================================

sorting:
  default_field: created_at
  default_order: desc
  allowed_fields:
    - created_at
    - updated_at
    - name
    - id

# =============================================================================
# SEARCH
# =============================================================================

search:
  enabled: true
  min_length: 3
  max_results: 100
  fuzzy_matching: false
```

---

# 4. DATABASE CONFIGURATION

## 4.1 config/database.yaml

```yaml
# =============================================================================
# SURREALDB
# =============================================================================

database:
  driver: surrealdb
  source: surrealdb://root:root@localhost:8000/schoolpilot/main
  
  surrealdb:
    host: localhost
    port: 8000
    username: root
    password: root
    namespace: schoolpilot
    database: main
    timeout: 30s
    timeout_write: 60s
    
  pool:
    min_connections: 5
    max_connections: 50
    max_idle_time: 300s
    health_check_interval: 30s
    
  # Connection options
  options:
    # Enable strict mode
    strict: true
    
    # Enable full-text indexing
    full_text_indexing: true
    
    # Default namespace for queries
    default_namespace: schoolpilot
    
    # Query timeout
    query_timeout: 30s
    
    # Live query settings
    live:
      enabled: true
      ttl: 3600
      heartbeat: 30

# =============================================================================
# MIGRATIONS
# =============================================================================

migrations:
  enabled: true
  path: ./migrations
  table_name: _migrations
  auto_migrate: true
  create_on_startup: true

# =============================================================================
# SEEDING
# =============================================================================

seeding:
  enabled: false          # Set to true in development
  path: ./seeders
  truncate: false         # Truncate tables before seeding
  users: true
  roles: true
  permissions: true
  academic_structure: true
  finance_defaults: true
  grading_schemes: true

# =============================================================================
# BACKUP
# =============================================================================

backup:
  enabled: true
  path: ./backups
  retention_days: 30
  schedule: "0 2 * * *"  # Daily at 2 AM
  compression: gzip
```

---

# 5. AUTHENTICATION CONFIGURATION

## 5.1 config/auth.yaml

```yaml
# =============================================================================
# AUTHENTICATION
# =============================================================================

auth:
  # JWT Configuration
  jwt:
    secret_key: ${JWT_SECRET_KEY}
    access_expiry: 15m
    refresh_expiry: 7d
    issuer: schoolpilot
    audience: schoolpilot-api
    signing_algorithm: HS256
    
  # Token Claims
  claims:
    include_user_id: true
    include_email: true
    include_roles: true
    include_permissions: true
    
  # Session Configuration
  session:
    enabled: true
    timeout: 24h
    cookie_name: sp_session
    cookie_secure: true
    cookie_http_only: true
    cookie_same_site: strict
    cookie_path: /
    
  # Password Configuration
  password:
    bcrypt_cost: 12
    min_length: 8
    require_uppercase: true
    require_lowercase: true
    require_number: true
    require_special: true
    max_age_days: 90
    prevent_reuse: 5
    reset_token_expiry: 1h
    
  # Login Attempts
  login_attempts:
    max_attempts: 5
    lockout_duration: 30m
    reset_duration: 24h
    
  # Two-Factor Authentication
  tfa:
    enabled: false
    issuer: SchoolPilot
    code_length: 6
    window: 1
```

---

# 6. SECURITY CONFIGURATION

## 6.1 config/security.yaml

```yaml
# =============================================================================
# SECURITY
# =============================================================================

security:
  # CORS
  cors:
    enabled: true
    allowed_origins:
      - http://localhost:5173
      - http://localhost:3000
      - https://app.schoolpilot.edu
    allowed_methods:
      - GET
      - POST
      - PUT
      - DELETE
      - PATCH
      - OPTIONS
    allowed_headers:
      - Content-Type
      - Authorization
      - X-Request-ID
      - X-Correlation-ID
    exposed_headers:
      - X-Total-Count
      - X-Page-Number
    allow_credentials: true
    max_age: 86400
    
  # Rate Limiting
  rate_limit:
    enabled: true
    default:
      requests: 100
      window: 1m
    endpoints:
      /api/v1/auth/login:
        requests: 5
        window: 1m
      /api/v1/auth/forgot-password:
        requests: 3
        window: 1h
      /api/v1/students:
        requests: 200
        window: 1m
        
  # CSRF
  csrf:
    enabled: true
    cookie_name: sp_csrf
    header_name: X-CSRF-Token
    exclude_paths:
      - /health
      - /api/v1/auth/login
      
  # Headers
  headers:
    x_frame_options: DENY
    x_content_type_options: nosniff
    x_xss_protection: 1; mode=block
    strict_transport_security: max-age=31536000; includeSubDomains
    content_security_policy: "default-src 'self'"
    referrer_policy: strict-origin-when-cross-origin
    
  # API Keys
  api_keys:
    enabled: false
    header_name: X-API-Key
    length: 32
    expiry_days: 365
```

---

# 7. API CONFIGURATION

## 7.1 config/api.yaml

```yaml
# =============================================================================
# API CONFIGURATION
# =============================================================================

api:
  # Versioning
  versioning:
    enabled: true
    default_version: v1
    parameter_name: version
    header_name: Accept
    
  # Documentation
  docs:
    enabled: true
    path: /api/docs
    title: SchoolPilot API
    description: School Management System API
    version: 1.0.0
    contact:
      name: API Support
      email: support@schoolpilot.edu
      
  # Response
  response:
    wrap: true
    include_timestamp: true
    include_request_id: true
    include_version: true
    pretty_print: false
    
  # Compression
  compression:
    enabled: true
    level: 6
    min_size: 1024
    
  # Request
  request:
    max_body_size: 10485760  # 10MB
    timeout: 30s
    validate_headers: true
    
  # Pagination
  pagination:
    default_page_size: 20
    max_page_size: 100
    page_parameter: page
    per_page_parameter: per_page
    
  # Filtering
  filtering:
    enabled: true
    operators:
      - eq       # equal
      - ne       # not equal
      - gt       # greater than
      - gte      # greater than or equal
      - lt       # less than
      - lte      # less than or equal
      - in       # in list
      - contains # contains
      - starts   # starts with
      - ends     # ends with
      
  # Sorting
  sorting:
    enabled: true
    default_field: created_at
    default_order: desc
    allowed_fields:
      - id
      - name
      - created_at
      - updated_at
      
  # Field Selection
  fields:
    enabled: true
    parameter: fields
    max_fields: 50
```

---

# 8. FEATURE FLAGS

## 8.1 config/features.yaml

```yaml
# =============================================================================
# FEATURE FLAGS
# =============================================================================

features:
  # Authentication
  auth:
    social_login: false
    sso: false
    passwordless: false
    registration: false
    
  # Students
  students:
    photo_upload: true
    document_upload: true
    transport: true
    meal_plans: true
    biometric_id: false
    
  # Academics
  academics:
    online_exams: false
    live_streaming: false
    assignments: true
    resources: true
    parent_portal: true
    
  # Finance
  finance:
    online_payments: false
    payment_reminders: true
    late_fees: true
    installments: true
    refunds: false
    
  # Library
  library:
    online_catalog: true
    reservations: true
    renewals: true
    fines: true
    
  # Inventory
  inventory:
    barcodes: true
    rfid: false
    alerts: true
    auto_reorder: false
    
  # Reports
  reports:
    analytics: true
    dashboards: true
    exports: true
    scheduled: true
    
  # Integrations
  integrations:
    erpnext: false
    moodle: false
    zoho: false
    slack: false
```

---

# 9. MODULE CONFIGURATION

## 9.1 config/modules.yaml

```yaml
# =============================================================================
# MODULE CONFIGURATION
# =============================================================================

modules:
  # Administration Module
  administration:
    enabled: true
    settings:
      student_id_format: "ADM/{year}/{sequence}"
      staff_id_format: "STF/{sequence}"
      auto_admission_number: true
      require_photo: true
      require_guardian: true
      
  # Academics Module
  academics:
    enabled: true
    settings:
      max_subjects_per_student: 8
      max_class_size: 50
      require_attendance: true
      attendance_threshold: 85
      exam_publish_days: 7
      
  # Finance Module
  finance:
    enabled: true
    settings:
      currency: KES
      decimal_places: 2
      late_fee_percentage: 5
      late_fee_grace_days: 7
      invoice_due_days: 30
      receipt_format: "RCP/{year}/{sequence}"
      require_approval_amount: 100000
      
  # HR Module
  hr:
    enabled: true
    settings:
      payroll_day: 25
      salaryAdvanceLimit: 50
      max_loan_deductions: 30
      leave_approval_required: true
      
  # Library Module
  library:
    enabled: true
    settings:
      max_books_student: 3
      max_books_staff: 5
      loan_days_student: 14
      loan_days_staff: 30
      fine_per_day: 10
      max_renewals: 2
      
  # Inventory Module
  inventory:
    enabled: true
    settings:
      low_stock_threshold: 10
      require_approval: true
      approval_threshold: 50000
      
  # Nutrition Module
  nutrition:
    enabled: true
    settings:
      wallet_enabled: true
      meal_selection: true
      dietary_tracking: true
      
  # Admissions Module
  admissions:
    enabled: true
    settings:
      application_format: "APP/{year}/{sequence}"
      require_interview: true
      auto_enrollment: false
```

---

# 10. THIRD-PARTY INTEGRATIONS

## 10.1 config/integrations.yaml

```yaml
# =============================================================================
# THIRD-PARTY INTEGRATIONS
# =============================================================================

integrations:
  # SMS
  sms:
    driver: twilio
    twilio:
      account_sid: ${TWILIO_ACCOUNT_SID}
      auth_token: ${TWILIO_AUTH_TOKEN}
      phone_number: +1234567890
    africa_talking:
      api_key: ${AFRICA_TALKING_API_KEY}
      username: sandbox
      
  # Email
  email:
    driver: smtp
    smtp:
      host: ${SMTP_HOST}
      port: ${SMTP_PORT}
      username: ${SMTP_USERNAME}
      password: ${SMTP_PASSWORD}
      from: noreply@schoolpilot.edu
      from_name: SchoolPilot
      
  # Storage
  storage:
    driver: local
    local:
      path: /var/storage
    s3:
      bucket: ${AWS_S3_BUCKET}
      region: ${AWS_REGION}
      access_key: ${AWS_ACCESS_KEY_ID}
      secret_key: ${AWS_SECRET_ACCESS_KEY}
      
  # Payments
  payments:
    mpesa:
      enabled: false
      consumer_key: ${MPESA_CONSUMER_KEY}
      consumer_secret: ${MPESA_CONSUMER_SECRET}
      shortcode: ${MPESA_SHORTCODE}
      passkey: ${MPESA_PASSKEY}
      callback_url: https://api.schoolpilot.edu/api/v1/payments/mpesa/callback
      
  # Analytics
  analytics:
    google:
      enabled: false
      tracking_id: UA-XXXXX-X
    sentry:
      enabled: false
      dsn: ${SENTRY_DSN}
      
  # Authentication
  oauth:
    google:
      enabled: false
      client_id: ${GOOGLE_CLIENT_ID}
      client_secret: ${GOOGLE_CLIENT_SECRET}
    microsoft:
      enabled: false
      client_id: ${MICROSOFT_CLIENT_ID}
      client_secret: ${MICROSOFT_CLIENT_SECRET}
```

---

# 11. CONFIGURATION EXAMPLES

## 11.1 Development Environment (.env.development)

```bash
# Server
ENV=development
SERVER_PORT=8080
APP_DEBUG=true

# Database
SURREALDB_HOST=localhost
SURREALDB_PORT=8000
SURREALDB_USER=root
SURREALDB_PASS=root
SURREALDB_NAMESPACE=schoolpilot
SURREALDB_DATABASE=development

# JWT
JWT_SECRET_KEY=dev-secret-key-min-32-characters-long

# Logging
LOG_LEVEL=debug
LOG_FORMAT=text

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Email (Development - Mailhog)
EMAIL_ENABLED=true
EMAIL_DRIVER=smtp
EMAIL_HOST=localhost
EMAIL_PORT=1025

# Seeding
DB_SEED=true
```

## 11.2 Production Environment (.env.production)

```bash
# Server
ENV=production
SERVER_PORT=8080
APP_DEBUG=false

# Database
SURREALDB_HOST=surrealdb.internal
SURREALDB_PORT=8000
SURREALDB_USER=${SURREALDB_USER}
SURREALDB_PASS=${SURREALDB_PASS}
SURREALDB_NAMESPACE=schoolpilot
SURREALDB_DATABASE=production

# JWT
JWT_SECRET_KEY=${JWT_SECRET_KEY}

# Security
BCRYPT_COST=12
CORS_ENABLED=true
CORS_ALLOWED_ORIGINS=https://app.schoolpilot.edu

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100

# Redis
CACHE_ENABLED=true
CACHE_TYPE=redis
REDIS_HOST=redis.internal
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# Email
EMAIL_ENABLED=true
EMAIL_DRIVER=ses

# Backup
BACKUP_ENABLED=true

# Monitoring
SENTRY_ENABLED=true
SENTRY_DSN=${SENTRY_DSN}
```

## 11.3 Kubernetes Values (values.yaml)

```yaml
# Kubernetes Deployment Values

replicaCount: 3

image:
  repository: schoolpilot/api
  tag: latest
  pullPolicy: Always

service:
  type: ClusterIP
  port: 8080

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.schoolpilot.edu
      paths:
        - path: /
          pathType: Prefix

env:
  - name: ENV
    value: production
  - name: SURREALDB_HOST
    valueFrom:
      secretKeyRef:
        name: schoolpilot-db
        key: host
  - name: JWT_SECRET_KEY
    valueFrom:
      secretKeyRef:
        name: schoolpilot-secrets
        key: jwt-secret

resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

---

**Document Version:** 1.0  
**Last Updated:** February 17, 2026
