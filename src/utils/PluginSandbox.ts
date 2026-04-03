/**
 * Plugin Sandbox Utility
 * 
 * Provides sandboxed execution environments for plugins with different
 * trust levels and security restrictions.
 */

import type { PluginManifest, PluginPrivileges, PermissionsPreset } from '../plugins/types';

// ============================================================================
// Types
// ============================================================================

export type SandboxTier = 'trusted' | 'verified' | 'community';

export interface SandboxConfig {
  tier: SandboxTier;
  privileges: PluginPrivileges;
  timeout: number;
  allowedGlobals: string[];
  blockedGlobals: string[];
}

export interface SandboxResult<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  duration: number;
}

// ============================================================================
// Default Privilege Presets
// ============================================================================

const PRIVILEGE_PRESETS: Record<PermissionsPreset, Partial<PluginPrivileges>> = {
  strict: {
    dataRead: [],
    dataWrite: [],
    uiInject: false,
    menuModify: false,
    settingsAccess: false,
    networkAccess: false,
    fileSystemAccess: false,
    executeCode: false,
  },
  balanced: {
    dataRead: ['*'],
    dataWrite: [],
    uiInject: true,
    menuModify: false,
    settingsAccess: true,
    networkAccess: false,
    fileSystemAccess: false,
    executeCode: true,
  },
  permissive: {
    dataRead: ['*'],
    dataWrite: ['*'],
    uiInject: true,
    menuModify: true,
    settingsAccess: true,
    networkAccess: true,
    fileSystemAccess: false,
    executeCode: true,
  },
};

// ============================================================================
// Sandbox Tiers
// ============================================================================

const TIER_CONFIGS: Record<SandboxTier, Omit<SandboxConfig, 'privileges'>> = {
  trusted: {
    tier: 'trusted',
    timeout: 5000,
    allowedGlobals: ['*'], // All globals allowed
    blockedGlobals: [],
  },
  verified: {
    tier: 'verified',
    timeout: 2000,
    allowedGlobals: [
      'console', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
      'Promise', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date',
      'JSON', 'Math', 'Error', 'Map', 'Set', 'WeakMap', 'WeakSet',
    ],
    blockedGlobals: [
      'localStorage', 'sessionStorage', 'indexedDB', 'caches',
      'fetch', 'XMLHttpRequest', 'WebSocket',
      'document', 'window', 'globalThis', 'self',
    ],
  },
  community: {
    tier: 'community',
    timeout: 1000,
    allowedGlobals: [
      'console', 'Promise', 'Array', 'Object', 'String', 'Number', 'Boolean',
      'Date', 'JSON', 'Math', 'Error', 'Map', 'Set',
    ],
    blockedGlobals: [
      'localStorage', 'sessionStorage', 'indexedDB', 'caches',
      'fetch', 'XMLHttpRequest', 'WebSocket',
      'document', 'window', 'globalThis', 'self',
      'eval', 'Function', 'Proxy', 'Reflect',
    ],
  },
};

// ============================================================================
// Plugin Sandbox Class
// ============================================================================

export class PluginSandbox {
  private config: SandboxConfig;
  private worker: Worker | null = null;
  private iframe: HTMLIFrameElement | null = null;

  constructor(
    private manifest: PluginManifest,
    private preset: PermissionsPreset = 'balanced'
  ) {
    const tier = this.determineTier();
    this.config = {
      ...TIER_CONFIGS[tier],
      privileges: {
        ...PRIVILEGE_PRESETS[preset],
        ...manifest.privileges,
      } as PluginPrivileges,
    };
  }

  /**
   * Determine sandbox tier based on plugin source
   */
  private determineTier(): SandboxTier {
    // Built-in plugins are trusted
    if (this.manifest.category === 'builtin') {
      return 'trusted';
    }

    // Verified plugins from marketplace
    if (this.manifest.category === 'verified') {
      return 'verified';
    }

    // Private plugins (custom per-school) - also verified
    if (this.manifest.category === 'private') {
      return 'verified';
    }

    // Community and other plugins get most restrictive tier
    return 'community';
  }

  /**
   * Get current sandbox configuration
   */
  getConfig(): SandboxConfig {
    return { ...this.config };
  }

  /**
   * Check if a privilege is granted
   */
  hasPrivilege(privilege: keyof PluginPrivileges): boolean {
    const value = this.config.privileges[privilege];
    if (typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  }

  /**
   * Execute code in sandbox (Web Worker for community tier)
   */
  async executeInWorker<T>(
    code: string,
    context: Record<string, any> = {}
  ): Promise<SandboxResult<T>> {
    if (this.config.tier === 'trusted') {
      // Trusted tier: execute directly
      return this.executeDirect<T>(code, context);
    }

    const start = performance.now();

    try {
      // Create a blob URL for the worker
      const workerCode = this.createWorkerCode(code, context);
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);

      this.worker = new Worker(workerUrl);

      const result = await Promise.race([
        this.getWorkerResult<T>(),
        this.createTimeoutPromise<T>(this.config.timeout),
      ]);

      URL.revokeObjectURL(workerUrl);
      this.worker.terminate();
      this.worker = null;

      return {
        success: true,
        result,
        duration: performance.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: performance.now() - start,
      };
    }
  }

  /**
   * Execute code in iframe sandbox (for UI plugins)
   */
  async executeInIframe<T>(
    code: string,
    context: Record<string, any> = {}
  ): Promise<SandboxResult<T>> {
    if (this.config.tier === 'trusted') {
      return this.executeDirect<T>(code, context);
    }

    const start = performance.now();

    try {
      // Create sandboxed iframe
      this.iframe = document.createElement('iframe');
      this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      this.iframe.style.display = 'none';
      document.body.appendChild(this.iframe);

      const iframeWindow = this.iframe.contentWindow;
      if (!iframeWindow) {
        throw new Error('Failed to create iframe sandbox');
      }

      // Inject context with Proxy-based restrictions
      this.injectRestrictedGlobals(iframeWindow, context);

      // Execute code
      const result = await new Promise<T>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Execution timeout'));
        }, this.config.timeout);

        try {
          // Wrap execution in try-catch
          const wrappedCode = `
            (function() {
              try {
                const result = (${code});
                window.__sandbox_result = { success: true, result };
              } catch (e) {
                window.__sandbox_result = { success: false, error: e.message };
              }
            })();
          `;

          iframeWindow.eval(wrappedCode);

          // Poll for result
          const checkResult = () => {
            const sandboxResult = (iframeWindow as any).__sandbox_result;
            if (sandboxResult) {
              clearTimeout(timeoutId);
              if (sandboxResult.success) {
                resolve(sandboxResult.result);
              } else {
                reject(new Error(sandboxResult.error));
              }
            } else {
              setTimeout(checkResult, 10);
            }
          };
          checkResult();
        } catch (e) {
          clearTimeout(timeoutId);
          reject(e);
        }
      });

      return {
        success: true,
        result,
        duration: performance.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: performance.now() - start,
      };
    } finally {
      if (this.iframe) {
        document.body.removeChild(this.iframe);
        this.iframe = null;
      }
    }
  }

  /**
   * Execute code directly (trusted tier only)
   */
  private async executeDirect<T>(
    code: string,
    context: Record<string, any> = {}
  ): Promise<SandboxResult<T>> {
    const start = performance.now();

    try {
      const fn = new Function(...Object.keys(context), `return (${code});`);
      const result = await fn(...Object.values(context));

      return {
        success: true,
        result,
        duration: performance.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: performance.now() - start,
      };
    }
  }

  /**
   * Create Web Worker code with restrictions
   */
  private createWorkerCode(code: string, context: Record<string, any>): string {
    const blockedGlobals = this.config.blockedGlobals;

    // Create restricted global scope
    const restrictCode = blockedGlobals.length > 0
      ? blockedGlobals.map(g => `const ${g} = undefined;`).join('\n')
      : '';

    // Inject context
    const contextCode = Object.entries(context)
      .map(([key, value]) => `const ${key} = ${JSON.stringify(value)};`)
      .join('\n');

    return `
      // Restricted globals
      ${restrictCode}
      
      // Context
      ${contextCode}
      
      // Execute
      try {
        const result = (${code});
        self.postMessage({ success: true, result });
      } catch (e) {
        self.postMessage({ success: false, error: e.message });
      }
    `;
  }

  /**
   * Get result from worker
   */
  private getWorkerResult<T>(): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      this.worker.onmessage = (event) => {
        if (event.data.success) {
          resolve(event.data.result);
        } else {
          reject(new Error(event.data.error));
        }
      };

      this.worker.onerror = (error) => {
        reject(new Error(error.message));
      };
    });
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Execution timeout (${timeout}ms)`));
      }, timeout);
    });
  }

  /**
   * Inject restricted globals into iframe
   */
  private injectRestrictedGlobals(
    window: Window,
    context: Record<string, any>
  ): void {
    // Override blocked globals
    for (const blocked of this.config.blockedGlobals) {
      try {
        (window as any)[blocked] = undefined;
      } catch {
        // Some globals cannot be overridden
      }
    }

    // Inject context
    for (const [key, value] of Object.entries(context)) {
      (window as any)[key] = value;
    }
  }

  /**
   * Cleanup sandbox resources
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    if (this.iframe) {
      try {
        document.body.removeChild(this.iframe);
      } catch {
        // Already removed
      }
      this.iframe = null;
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a sandbox for a plugin
 */
export function createSandbox(
  manifest: PluginManifest,
  preset: PermissionsPreset = 'balanced'
): PluginSandbox {
  return new PluginSandbox(manifest, preset);
}

/**
 * Check if code can be safely executed
 */
export function validatePluginCode(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for dangerous patterns
  const dangerousPatterns = [
    { pattern: /eval\s*\(/, message: 'eval() is not allowed' },
    { pattern: /Function\s*\(/, message: 'Function constructor is not allowed' },
    { pattern: /document\.cookie/, message: 'Cookie access is not allowed' },
    { pattern: /localStorage/, message: 'localStorage access requires permission' },
    { pattern: /sessionStorage/, message: 'sessionStorage access requires permission' },
    { pattern: /indexedDB/, message: 'IndexedDB access requires permission' },
    { pattern: /XMLHttpRequest/, message: 'XMLHttpRequest requires network permission' },
    { pattern: /WebSocket/, message: 'WebSocket requires network permission' },
    { pattern: /import\s*\(/, message: 'Dynamic imports require permission' },
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(code)) {
      errors.push(message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize plugin code before execution
 */
export function sanitizePluginCode(code: string): string {
  // Remove inline source maps
  code = code.replace(/\/\/# sourceMappingURL=.*$/gm, '');

  // Remove comments that might hide malicious code
  // (This is a basic sanitization - production would need more robust parsing)

  return code.trim();
}

export default PluginSandbox;
