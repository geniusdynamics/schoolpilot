import { logger } from '@/utils/logging';

// ABOUTME: Version manager service
// ABOUTME: Handles version validation and compatibility checking

import semver from 'semver';

class VersionManager {
  /**
   * Validate that a module version satisfies a version constraint
   */
  static validateVersion(moduleVersion: string, constraint: string): boolean {
    try {
      return semver.satisfies(moduleVersion, constraint);
    } catch (error) {
      logger.error(`❌ [VersionManager] Invalid version constraint: ${constraint}`, error);
      return false;
    }
  }

  /**
   * Find the best compatible version from available versions
   */
  static findCompatibleVersion(constraint: string, availableVersions: string[]): string | null {
    const compatible = availableVersions
      .filter(version => this.validateVersion(version, constraint))
      .sort((a, b) => semver.rcompare(a, b)); // Sort by version descending
    
    return compatible.length > 0 ? compatible[0] : null;
  }

  /**
   * Get version compatibility information
   */
  static getVersionCompatibility(
    constraint: string, 
    currentVersion: string
  ): { 
    compatible: boolean; 
    message: string;
    recommended?: string;
  } {
    const compatible = this.validateVersion(currentVersion, constraint);
    
    if (compatible) {
      return {
        compatible: true,
        message: `Version ${currentVersion} satisfies constraint ${constraint}`
      };
    }
    
    return {
      compatible: false,
      message: `Version ${currentVersion} does not satisfy constraint ${constraint}`
    };
  }

  /**
   * Parse version constraint to get min/max versions
   */
  static parseConstraint(constraint: string): { 
    min?: string; 
    max?: string; 
    exact?: string;
  } {
    try {
      // Handle exact version
      if (!constraint.startsWith('^') && !constraint.startsWith('~')) {
        return { exact: constraint };
      }
      
      // Handle caret (^) - allows changes that do not modify the left-most non-zero digit
      if (constraint.startsWith('^')) {
        const version = constraint.substring(1);
        const parts = version.split('.');
        if (parts.length >= 2) {
          const major = parseInt(parts[0]);
          const nextMajor = major + 1;
          return {
            min: version,
            max: `${nextMajor}.0.0`
          };
        }
      }
      
      // Handle tilde (~) - allows patch-level changes
      if (constraint.startsWith('~')) {
        const version = constraint.substring(1);
        const parts = version.split('.');
        if (parts.length >= 2) {
          const major = parseInt(parts[0]);
          const minor = parseInt(parts[1]);
          const nextMinor = minor + 1;
          return {
            min: version,
            max: `${major}.${nextMinor}.0`
          };
        }
      }
      
      return {};
    } catch (error) {
      logger.error(`❌ [VersionManager] Error parsing constraint: ${constraint}`, error);
      return {};
    }
  }
}

export { VersionManager };