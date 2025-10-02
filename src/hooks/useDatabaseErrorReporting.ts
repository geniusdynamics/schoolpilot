// ABOUTME: Hook for enhanced database error reporting and logging
// ABOUTME: Provides structured error reporting with database-specific context and recovery suggestions

import { useCallback, useRef } from 'react';
import { reportError, reportMessage } from '../config/errorTracking';

interface DatabaseErrorContext {
  operation?: string;
  collection?: string;
  provider?: string;
  deploymentMode?: string;
  retryCount?: number;
  dataSize?: number;
  queryType?: 'read' | 'write' | 'delete' | 'migration' | 'initialization';
  additionalContext?: Record<string, any>;
}

interface DatabaseErrorReport {
  errorId: string;
  timestamp: string;
  category: 'initialization' | 'operation' | 'corruption' | 'quota' | 'network' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  suggestions: string[];
}

export const useDatabaseErrorReporting = () => {
  const errorCountRef = useRef<Map<string, number>>(new Map());
  const lastErrorRef = useRef<Map<string, number>>(new Map());

  const categorizeError = useCallback((error: Error): DatabaseErrorReport['category'] => {
    const message = error.message.toLowerCase();
    
    if (message.includes('initialization') || message.includes('init')) {
      return 'initialization';
    }
    if (message.includes('quota') || message.includes('storage') || message.includes('full')) {
      return 'quota';
    }
    if (message.includes('corrupt') || message.includes('integrity') || message.includes('malformed')) {
      return 'corruption';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('operation') || message.includes('transaction') || message.includes('query')) {
      return 'operation';
    }
    
    return 'unknown';
  }, []);

  const getSeverity = useCallback((error: Error, context: DatabaseErrorContext): DatabaseErrorReport['severity'] => {
    const category = categorizeError(error);
    const retryCount = context.retryCount || 0;
    
    // Critical errors that prevent app functionality
    if (category === 'initialization' || category === 'corruption') {
      return 'critical';
    }
    
    // High severity for quota issues or repeated failures
    if (category === 'quota' || retryCount > 2) {
      return 'high';
    }
    
    // Medium severity for operation failures
    if (category === 'operation' || category === 'network') {
      return 'medium';
    }
    
    return 'low';
  }, [categorizeError]);

  const isRecoverable = useCallback((error: Error, context: DatabaseErrorContext): boolean => {
    const category = categorizeError(error);
    const retryCount = context.retryCount || 0;
    
    // Non-recoverable errors
    if (category === 'corruption' || retryCount > 5) {
      return false;
    }
    
    // Quota errors are recoverable with user action
    if (category === 'quota') {
      return true;
    }
    
    // Most other errors are recoverable
    return true;
  }, [categorizeError]);

  const getSuggestions = useCallback((error: Error, context: DatabaseErrorContext): string[] => {
    const category = categorizeError(error);
    const suggestions: string[] = [];
    
    switch (category) {
      case 'initialization':
        suggestions.push('Check browser compatibility with modern storage APIs');
        suggestions.push('Clear browser cache and cookies');
        suggestions.push('Try using a different browser');
        suggestions.push('Disable browser extensions that might interfere');
        break;
        
      case 'quota':
        suggestions.push('Clear old data from the application');
        suggestions.push('Clear browser storage for other websites');
        suggestions.push('Contact administrator about storage limits');
        suggestions.push('Export data and reset the database');
        break;
        
      case 'corruption':
        suggestions.push('Restore from a recent backup');
        suggestions.push('Reset the database configuration');
        suggestions.push('Contact technical support');
        suggestions.push('Export any recoverable data before resetting');
        break;
        
      case 'network':
        suggestions.push('Check internet connection');
        suggestions.push('Try again when connection is stable');
        suggestions.push('Switch to offline mode if available');
        suggestions.push('Contact network administrator');
        break;
        
      case 'operation':
        suggestions.push('Try the operation again');
        suggestions.push('Refresh the page and retry');
        suggestions.push('Check if data is valid');
        suggestions.push('Contact support if problem persists');
        break;
        
      default:
        suggestions.push('Refresh the page and try again');
        suggestions.push('Clear browser cache if problem persists');
        suggestions.push('Contact technical support with error details');
    }
    
    return suggestions;
  }, [categorizeError]);

  const collectSystemContext = useCallback(async (): Promise<Record<string, any>> => {
    const context: Record<string, any> = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      onLine: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      url: window.location.href,
      referrer: document.referrer
    };

    // Storage information
    try {
      context.storage = {
        indexedDBSupported: 'indexedDB' in window,
        opfsSupported: 'storage' in navigator && 'getDirectory' in navigator.storage,
        webAssemblySupported: 'WebAssembly' in window,
        localStorageAvailable: typeof Storage !== 'undefined'
      };

      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        context.storage.quota = estimate.quota;
        context.storage.usage = estimate.usage;
        context.storage.usagePercentage = estimate.quota ? 
          Math.round((estimate.usage! / estimate.quota) * 100) : 0;
      }
    } catch (e) {
      context.storageError = e instanceof Error ? e.message : String(e);
    }

    // Database-specific context
    try {
      const dbKeys = Object.keys(localStorage).filter(key => 
        key.includes('db') || key.includes('database') || key.includes('config')
      );
      context.databaseKeys = dbKeys.length;
      context.localStorageSize = JSON.stringify(localStorage).length;
    } catch (e) {
      context.localStorageError = e instanceof Error ? e.message : String(e);
    }

    return context;
  }, []);

  const shouldThrottle = useCallback((errorKey: string): boolean => {
    const now = Date.now();
    const lastError = lastErrorRef.current.get(errorKey) || 0;
    const timeSinceLastError = now - lastError;
    
    // Throttle identical errors within 30 seconds
    if (timeSinceLastError < 30000) {
      return true;
    }
    
    lastErrorRef.current.set(errorKey, now);
    return false;
  }, []);

  const reportDatabaseError = useCallback(async (
    error: Error,
    context: DatabaseErrorContext = {}
  ): Promise<DatabaseErrorReport> => {
    const errorId = `db-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const category = categorizeError(error);
    const severity = getSeverity(error, context);
    const recoverable = isRecoverable(error, context);
    const suggestions = getSuggestions(error, context);
    
    // Create error key for throttling
    const errorKey = `${error.message}-${context.operation || 'unknown'}`;
    
    // Increment error count
    const currentCount = errorCountRef.current.get(errorKey) || 0;
    errorCountRef.current.set(errorKey, currentCount + 1);
    
    // Check if we should throttle this error
    if (shouldThrottle(errorKey) && severity !== 'critical') {
      console.warn(`🔄 [DatabaseErrorReporting] Throttling error: ${errorKey}`);
      return {
        errorId,
        timestamp: new Date().toISOString(),
        category,
        severity,
        recoverable,
        suggestions
      };
    }

    const report: DatabaseErrorReport = {
      errorId,
      timestamp: new Date().toISOString(),
      category,
      severity,
      recoverable,
      suggestions
    };

    // Log error locally
    console.error('🗄️ [DatabaseErrorReporting] Database error:', {
      errorId,
      error: error.message,
      stack: error.stack,
      category,
      severity,
      recoverable,
      context,
      errorCount: currentCount + 1
    });

    // Collect system context
    const systemContext = await collectSystemContext();

    // Report to external error tracking
    try {
      reportError(error, {
        ...systemContext,
        errorId,
        errorBoundary: 'DatabaseErrorReporting',
        category,
        severity,
        recoverable,
        suggestions,
        databaseContext: context,
        errorCount: currentCount + 1,
        isThrottled: false
      });
    } catch (reportingError) {
      console.error('Failed to report database error to external service:', reportingError);
    }

    return report;
  }, [categorizeError, getSeverity, isRecoverable, getSuggestions, collectSystemContext, shouldThrottle]);

  const reportDatabaseOperation = useCallback((
    operation: string,
    success: boolean,
    duration?: number,
    context: Omit<DatabaseErrorContext, 'operation'> = {}
  ) => {
    const message = `Database operation: ${operation} ${success ? 'succeeded' : 'failed'}`;
    const level = success ? 'info' : 'warning';
    
    console.log(`🗄️ [DatabaseErrorReporting] ${message}`, {
      operation,
      success,
      duration,
      context
    });

    // Report significant operations or failures
    if (!success || (duration && duration > 5000)) {
      try {
        reportMessage(message, level);
      } catch (e) {
        console.error('Failed to report database operation:', e);
      }
    }
  }, []);

  const clearErrorCounts = useCallback(() => {
    errorCountRef.current.clear();
    lastErrorRef.current.clear();
  }, []);

  const getErrorStats = useCallback(() => {
    const stats = Array.from(errorCountRef.current.entries()).map(([key, count]) => ({
      errorKey: key,
      count,
      lastOccurrence: lastErrorRef.current.get(key) || 0
    }));
    
    return {
      totalUniqueErrors: stats.length,
      totalErrorCount: stats.reduce((sum, stat) => sum + stat.count, 0),
      errors: stats.sort((a, b) => b.count - a.count)
    };
  }, []);

  return {
    reportDatabaseError,
    reportDatabaseOperation,
    clearErrorCounts,
    getErrorStats,
    categorizeError,
    getSeverity,
    isRecoverable,
    getSuggestions
  };
};

export default useDatabaseErrorReporting;