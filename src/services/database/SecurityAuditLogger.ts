// ABOUTME: Comprehensive security audit logging system
// ABOUTME: Tracks security events, access patterns, and compliance reporting
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource: string;
  action: string;
  outcome: 'success' | 'failure' | 'blocked';
  details: Record<string, any>;
  riskScore: number;
  metadata: {
    source: string;
    version: string;
    environment: string;
  };
}

export type SecurityEventType = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'configuration_change'
  | 'security_violation'
  | 'suspicious_activity'
  | 'system_event';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditQuery {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: SecurityEventType[];
  severities?: SecuritySeverity[];
  userIds?: string[];
  resources?: string[];
  outcomes?: ('success' | 'failure' | 'blocked')[];
  minRiskScore?: number;
  maxRiskScore?: number;
  limit?: number;
  offset?: number;
}

export interface AuditReport {
  id: string;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalEvents: number;
    eventsByType: Record<SecurityEventType, number>;
    eventsBySeverity: Record<SecuritySeverity, number>;
    uniqueUsers: number;
    uniqueResources: number;
    averageRiskScore: number;
    topRisks: SecurityEvent[];
  };
  compliance: {
    gdprCompliant: boolean;
    hipaaCompliant: boolean;
    soxCompliant: boolean;
    issues: string[];
  };
  recommendations: string[];
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsLast24h: number;
  eventsLast7d: number;
  eventsLast30d: number;
  highRiskEvents: number;
  failedAuthentications: number;
  suspiciousActivities: number;
  dataAccessEvents: number;
  configurationChanges: number;
  averageRiskScore: number;
  topUsers: Array<{ userId: string; eventCount: number; riskScore: number }>;
  topResources: Array<{ resource: string; accessCount: number }>;
  riskTrend: Array<{ date: Date; riskScore: number }>;
}

/**
 * Security Audit Logger
 * Comprehensive security event logging and analysis system
 */
export class SecurityAuditLogger {
  private static instance: SecurityAuditLogger;
  private events: SecurityEvent[] = [];
  private listeners: ((event: SecurityEvent) => void)[] = [];
  private config: {
    maxEvents: number;
    retentionDays: number;
    enableRealTimeAlerts: boolean;
    riskThreshold: number;
    complianceMode: 'gdpr' | 'hipaa' | 'sox' | 'all';
  };

  private constructor() {
    this.config = {
      maxEvents: 100000,
      retentionDays: 365,
      enableRealTimeAlerts: true,
      riskThreshold: 7.0,
      complianceMode: 'all',
    };

    this.startCleanupProcess();
  }

  public static getInstance(): SecurityAuditLogger {
    if (!SecurityAuditLogger.instance) {
      SecurityAuditLogger.instance = new SecurityAuditLogger();
    }
    return SecurityAuditLogger.instance;
  }

  /**
   * Log a security event
   */
  public async logEvent(
    eventType: SecurityEventType,
    action: string,
    resource: string,
    outcome: 'success' | 'failure' | 'blocked',
    details: Record<string, any> = {},
    context: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType,
      severity: this.calculateSeverity(eventType, outcome, details),
      userId: context.userId,
      sessionId: context.sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource,
      action,
      outcome,
      details,
      riskScore: this.calculateRiskScore(eventType, outcome, details, context),
      metadata: {
        source: 'SchoolPilot3',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    };

    // Store event
    this.events.push(event);

    // Enforce retention limits
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }

    // Notify listeners
    this.notifyListeners(event);

    // Check for real-time alerts
    if (this.config.enableRealTimeAlerts && event.riskScore >= this.config.riskThreshold) {
      await this.triggerSecurityAlert(event);
    }

    console.log(`🔒 [SecurityAudit] ${eventType.toUpperCase()}: ${action} on ${resource} - ${outcome} (Risk: ${event.riskScore})`);
  }

  /**
   * Log authentication event
   */
  public async logAuthentication(
    action: 'login' | 'logout' | 'password_change' | 'account_locked',
    outcome: 'success' | 'failure' | 'blocked',
    userId?: string,
    details: Record<string, any> = {},
    context: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    await this.logEvent(
      'authentication',
      action,
      'user_account',
      outcome,
      {
        ...details,
        authMethod: details.authMethod || 'password',
        attemptCount: details.attemptCount || 1,
      },
      { userId, ...context }
    );
  }

  /**
   * Log authorization event
   */
  public async logAuthorization(
    action: string,
    resource: string,
    outcome: 'success' | 'failure' | 'blocked',
    userId?: string,
    details: Record<string, any> = {},
    context: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    await this.logEvent(
      'authorization',
      action,
      resource,
      outcome,
      {
        ...details,
        requiredPermissions: details.requiredPermissions || [],
        userPermissions: details.userPermissions || [],
      },
      { userId, ...context }
    );
  }

  /**
   * Log data access event
   */
  public async logDataAccess(
    action: 'read' | 'query' | 'export' | 'view',
    resource: string,
    outcome: 'success' | 'failure' | 'blocked',
    userId?: string,
    details: Record<string, any> = {},
    context: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    await this.logEvent(
      'data_access',
      action,
      resource,
      outcome,
      {
        ...details,
        recordCount: details.recordCount || 0,
        dataClassification: details.dataClassification || 'public',
        accessMethod: details.accessMethod || 'ui',
      },
      { userId, ...context }
    );
  }

  /**
   * Log data modification event
   */
  public async logDataModification(
    action: 'create' | 'update' | 'delete' | 'bulk_update' | 'bulk_delete',
    resource: string,
    outcome: 'success' | 'failure' | 'blocked',
    userId?: string,
    details: Record<string, any> = {},
    context: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    await this.logEvent(
      'data_modification',
      action,
      resource,
      outcome,
      {
        ...details,
        recordCount: details.recordCount || 1,
        dataClassification: details.dataClassification || 'public',
        oldValues: details.oldValues || {},
        newValues: details.newValues || {},
      },
      { userId, ...context }
    );
  }

  /**
   * Log configuration change event
   */
  public async logConfigurationChange(
    action: string,
    resource: string,
    outcome: 'success' | 'failure' | 'blocked',
    userId?: string,
    details: Record<string, any> = {},
    context: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    await this.logEvent(
      'configuration_change',
      action,
      resource,
      outcome,
      {
        ...details,
        configSection: details.configSection || 'unknown',
        oldConfig: details.oldConfig || {},
        newConfig: details.newConfig || {},
      },
      { userId, ...context }
    );
  }

  /**
   * Log security violation
   */
  public async logSecurityViolation(
    action: string,
    resource: string,
    details: Record<string, any> = {},
    context: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    await this.logEvent(
      'security_violation',
      action,
      resource,
      'blocked',
      {
        ...details,
        violationType: details.violationType || 'unknown',
        threatLevel: details.threatLevel || 'medium',
        mitigationAction: details.mitigationAction || 'blocked',
      },
      context
    );
  }

  /**
   * Query audit events
   */
  public queryEvents(query: AuditQuery = {}): SecurityEvent[] {
    let filteredEvents = [...this.events];

    // Filter by date range
    if (query.startDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= query.startDate!);
    }
    if (query.endDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp <= query.endDate!);
    }

    // Filter by event types
    if (query.eventTypes && query.eventTypes.length > 0) {
      filteredEvents = filteredEvents.filter(e => query.eventTypes!.includes(e.eventType));
    }

    // Filter by severities
    if (query.severities && query.severities.length > 0) {
      filteredEvents = filteredEvents.filter(e => query.severities!.includes(e.severity));
    }

    // Filter by user IDs
    if (query.userIds && query.userIds.length > 0) {
      filteredEvents = filteredEvents.filter(e => e.userId && query.userIds!.includes(e.userId));
    }

    // Filter by resources
    if (query.resources && query.resources.length > 0) {
      filteredEvents = filteredEvents.filter(e => query.resources!.includes(e.resource));
    }

    // Filter by outcomes
    if (query.outcomes && query.outcomes.length > 0) {
      filteredEvents = filteredEvents.filter(e => query.outcomes!.includes(e.outcome));
    }

    // Filter by risk score
    if (query.minRiskScore !== undefined) {
      filteredEvents = filteredEvents.filter(e => e.riskScore >= query.minRiskScore!);
    }
    if (query.maxRiskScore !== undefined) {
      filteredEvents = filteredEvents.filter(e => e.riskScore <= query.maxRiskScore!);
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    if (query.offset) {
      filteredEvents = filteredEvents.slice(query.offset);
    }
    if (query.limit) {
      filteredEvents = filteredEvents.slice(0, query.limit);
    }

    return filteredEvents;
  }

  /**
   * Generate audit report
   */
  public generateReport(
    startDate: Date,
    endDate: Date,
    options: {
      includeCompliance?: boolean;
      includeRecommendations?: boolean;
    } = {}
  ): AuditReport {
    const events = this.queryEvents({ startDate, endDate });

    // Calculate summary statistics
    const eventsByType: Record<SecurityEventType, number> = {
      authentication: 0,
      authorization: 0,
      data_access: 0,
      data_modification: 0,
      configuration_change: 0,
      security_violation: 0,
      suspicious_activity: 0,
      system_event: 0,
    };

    const eventsBySeverity: Record<SecuritySeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const uniqueUsers = new Set<string>();
    const uniqueResources = new Set<string>();
    let totalRiskScore = 0;

    events.forEach(event => {
      eventsByType[event.eventType]++;
      eventsBySeverity[event.severity]++;
      if (event.userId) uniqueUsers.add(event.userId);
      uniqueResources.add(event.resource);
      totalRiskScore += event.riskScore;
    });

    const averageRiskScore = events.length > 0 ? totalRiskScore / events.length : 0;
    const topRisks = events
      .filter(e => e.riskScore >= 7.0)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    // Generate compliance assessment
    const compliance = options.includeCompliance ? this.assessCompliance(events) : {
      gdprCompliant: true,
      hipaaCompliant: true,
      soxCompliant: true,
      issues: [],
    };

    // Generate recommendations
    const recommendations = options.includeRecommendations ? this.generateRecommendations(events) : [];

    return {
      id: this.generateReportId(),
      generatedAt: new Date(),
      period: { startDate, endDate },
      summary: {
        totalEvents: events.length,
        eventsByType,
        eventsBySeverity,
        uniqueUsers: uniqueUsers.size,
        uniqueResources: uniqueResources.size,
        averageRiskScore,
        topRisks,
      },
      compliance,
      recommendations,
    };
  }

  /**
   * Get security metrics
   */
  public getMetrics(): SecurityMetrics {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const eventsLast24h = this.queryEvents({ startDate: last24h }).length;
    const eventsLast7d = this.queryEvents({ startDate: last7d }).length;
    const eventsLast30d = this.queryEvents({ startDate: last30d }).length;

    const highRiskEvents = this.queryEvents({ minRiskScore: 7.0 }).length;
    const failedAuthentications = this.queryEvents({
      eventTypes: ['authentication'],
      outcomes: ['failure'],
    }).length;

    const suspiciousActivities = this.queryEvents({
      eventTypes: ['suspicious_activity', 'security_violation'],
    }).length;

    const dataAccessEvents = this.queryEvents({
      eventTypes: ['data_access'],
    }).length;

    const configurationChanges = this.queryEvents({
      eventTypes: ['configuration_change'],
    }).length;

    const totalRiskScore = this.events.reduce((sum, e) => sum + e.riskScore, 0);
    const averageRiskScore = this.events.length > 0 ? totalRiskScore / this.events.length : 0;

    // Calculate top users and resources
    const userEventCounts = new Map<string, { count: number; totalRisk: number }>();
    const resourceAccessCounts = new Map<string, number>();

    this.events.forEach(event => {
      if (event.userId) {
        const current = userEventCounts.get(event.userId) || { count: 0, totalRisk: 0 };
        userEventCounts.set(event.userId, {
          count: current.count + 1,
          totalRisk: current.totalRisk + event.riskScore,
        });
      }

      const currentCount = resourceAccessCounts.get(event.resource) || 0;
      resourceAccessCounts.set(event.resource, currentCount + 1);
    });

    const topUsers = Array.from(userEventCounts.entries())
      .map(([userId, data]) => ({
        userId,
        eventCount: data.count,
        riskScore: data.totalRisk / data.count,
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    const topResources = Array.from(resourceAccessCounts.entries())
      .map(([resource, accessCount]) => ({ resource, accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    // Calculate risk trend (last 7 days)
    const riskTrend: Array<{ date: Date; riskScore: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayEvents = this.queryEvents({ startDate: dayStart, endDate: dayEnd });
      const dayRiskScore = dayEvents.length > 0 
        ? dayEvents.reduce((sum, e) => sum + e.riskScore, 0) / dayEvents.length 
        : 0;

      riskTrend.push({ date: dayStart, riskScore: dayRiskScore });
    }

    return {
      totalEvents: this.events.length,
      eventsLast24h,
      eventsLast7d,
      eventsLast30d,
      highRiskEvents,
      failedAuthentications,
      suspiciousActivities,
      dataAccessEvents,
      configurationChanges,
      averageRiskScore,
      topUsers,
      topResources,
      riskTrend,
    };
  }

  /**
   * Calculate event severity
   */
  private calculateSeverity(
    eventType: SecurityEventType,
    outcome: 'success' | 'failure' | 'blocked',
    details: Record<string, any>
  ): SecuritySeverity {
    // Base severity by event type
    let baseSeverity: SecuritySeverity = 'low';

    switch (eventType) {
      case 'authentication':
        baseSeverity = outcome === 'failure' ? 'medium' : 'low';
        break;
      case 'authorization':
        baseSeverity = outcome === 'failure' ? 'medium' : 'low';
        break;
      case 'data_access':
        baseSeverity = details.dataClassification === 'sensitive' ? 'medium' : 'low';
        break;
      case 'data_modification':
        baseSeverity = 'medium';
        break;
      case 'configuration_change':
        baseSeverity = 'high';
        break;
      case 'security_violation':
        baseSeverity = 'high';
        break;
      case 'suspicious_activity':
        baseSeverity = 'high';
        break;
      case 'system_event':
        baseSeverity = 'low';
        break;
    }

    // Adjust based on outcome
    if (outcome === 'blocked' && baseSeverity === 'low') {
      baseSeverity = 'medium';
    }

    // Adjust based on details
    if (details.threatLevel === 'high' || details.violationType === 'critical') {
      baseSeverity = 'critical';
    }

    return baseSeverity;
  }

  /**
   * Calculate risk score (0-10)
   */
  private calculateRiskScore(
    eventType: SecurityEventType,
    outcome: 'success' | 'failure' | 'blocked',
    details: Record<string, any>,
    context: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): number {
    let riskScore = 0;

    // Base risk by event type
    const baseRisks: Record<SecurityEventType, number> = {
      authentication: 3,
      authorization: 4,
      data_access: 2,
      data_modification: 5,
      configuration_change: 7,
      security_violation: 9,
      suspicious_activity: 8,
      system_event: 1,
    };

    riskScore = baseRisks[eventType];

    // Adjust for outcome
    if (outcome === 'failure') riskScore += 2;
    if (outcome === 'blocked') riskScore += 1;

    // Adjust for data classification
    if (details.dataClassification === 'sensitive') riskScore += 2;
    if (details.dataClassification === 'confidential') riskScore += 3;

    // Adjust for threat level
    if (details.threatLevel === 'high') riskScore += 3;
    if (details.threatLevel === 'critical') riskScore += 5;

    // Adjust for bulk operations
    if (details.recordCount > 100) riskScore += 1;
    if (details.recordCount > 1000) riskScore += 2;

    // Adjust for repeated failures
    if (details.attemptCount > 3) riskScore += 2;
    if (details.attemptCount > 10) riskScore += 4;

    return Math.min(10, Math.max(0, riskScore));
  }

  /**
   * Assess compliance with regulations
   */
  private assessCompliance(events: SecurityEvent[]): {
    gdprCompliant: boolean;
    hipaaCompliant: boolean;
    soxCompliant: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    let gdprCompliant = true;
    let hipaaCompliant = true;
    let soxCompliant = true;

    // Check for GDPR compliance issues
    const dataAccessEvents = events.filter(e => e.eventType === 'data_access');
    const unauthorizedAccess = dataAccessEvents.filter(e => e.outcome === 'failure');
    
    if (unauthorizedAccess.length > 0) {
      issues.push(`${unauthorizedAccess.length} unauthorized data access attempts detected`);
      gdprCompliant = false;
    }

    // Check for HIPAA compliance issues
    const sensitiveDataAccess = events.filter(e => 
      e.eventType === 'data_access' && 
      e.details.dataClassification === 'sensitive'
    );

    if (sensitiveDataAccess.some(e => !e.userId)) {
      issues.push('Sensitive data accessed without proper user identification');
      hipaaCompliant = false;
    }

    // Check for SOX compliance issues
    const configChanges = events.filter(e => e.eventType === 'configuration_change');
    const unauthorizedConfigChanges = configChanges.filter(e => e.outcome === 'failure');

    if (unauthorizedConfigChanges.length > 0) {
      issues.push(`${unauthorizedConfigChanges.length} unauthorized configuration changes attempted`);
      soxCompliant = false;
    }

    return { gdprCompliant, hipaaCompliant, soxCompliant, issues };
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(events: SecurityEvent[]): string[] {
    const recommendations: string[] = [];

    // Check for high failure rates
    const authEvents = events.filter(e => e.eventType === 'authentication');
    const authFailures = authEvents.filter(e => e.outcome === 'failure');
    
    if (authEvents.length > 0 && authFailures.length / authEvents.length > 0.1) {
      recommendations.push('High authentication failure rate detected. Consider implementing account lockout policies.');
    }

    // Check for high-risk events
    const highRiskEvents = events.filter(e => e.riskScore >= 8);
    if (highRiskEvents.length > 0) {
      recommendations.push(`${highRiskEvents.length} high-risk events detected. Review security policies and access controls.`);
    }

    // Check for suspicious patterns
    const userEventCounts = new Map<string, number>();
    events.forEach(e => {
      if (e.userId) {
        userEventCounts.set(e.userId, (userEventCounts.get(e.userId) || 0) + 1);
      }
    });

    const suspiciousUsers = Array.from(userEventCounts.entries())
      .filter(([_, count]) => count > 100)
      .map(([userId]) => userId);

    if (suspiciousUsers.length > 0) {
      recommendations.push(`Unusual activity patterns detected for users: ${suspiciousUsers.join(', ')}. Consider additional monitoring.`);
    }

    return recommendations;
  }

  /**
   * Trigger security alert
   */
  private async triggerSecurityAlert(event: SecurityEvent): Promise<void> {
    console.warn(`🚨 [SecurityAlert] HIGH RISK EVENT DETECTED:
      Type: ${event.eventType}
      Action: ${event.action}
      Resource: ${event.resource}
      Risk Score: ${event.riskScore}
      User: ${event.userId || 'Unknown'}
      IP: ${event.ipAddress || 'Unknown'}
      Details: ${JSON.stringify(event.details)}`);

    // In a real implementation, this would send alerts via email, SMS, or other channels
  }

  /**
   * Start cleanup process for old events
   */
  private startCleanupProcess(): void {
    setInterval(() => {
      const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
      const initialCount = this.events.length;
      
      this.events = this.events.filter(event => event.timestamp > cutoffDate);
      
      const removedCount = initialCount - this.events.length;
      if (removedCount > 0) {
        console.log(`🧹 [SecurityAudit] Cleaned up ${removedCount} old audit events`);
      }
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  /**
   * Notify event listeners
   */
  private notifyListeners(event: SecurityEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('❌ [SecurityAudit] Listener error:', error);
      }
    });
  }

  /**
   * Utility methods
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public API methods
   */
  public addEventListener(listener: (event: SecurityEvent) => void): void {
    this.listeners.push(listener);
  }

  public removeEventListener(listener: (event: SecurityEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public updateConfig(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
    console.log('🔧 [SecurityAudit] Configuration updated');
  }

  public getConfig(): typeof this.config {
    return { ...this.config };
  }

  public exportEvents(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.events, null, 2);
    } else {
      // CSV export
      const headers = ['id', 'timestamp', 'eventType', 'severity', 'userId', 'resource', 'action', 'outcome', 'riskScore'];
      const csvRows = [headers.join(',')];
      
      this.events.forEach(event => {
        const row = [
          event.id,
          event.timestamp.toISOString(),
          event.eventType,
          event.severity,
          event.userId || '',
          event.resource,
          event.action,
          event.outcome,
          event.riskScore.toString(),
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
  }
}

// Export singleton instance
export const securityAuditLogger = SecurityAuditLogger.getInstance();