// ABOUTME: Tests for the centralized redirect map
// ABOUTME: Ensures all deprecated routes resolve to correct hub+tab destinations

import { describe, it, expect } from 'vitest';
import { DEPRECATED_ROUTE_REDIRECTS, getRedirectForRoute } from '../redirectMap';

describe('redirectMap', () => {
  describe('getRedirectForRoute', () => {
    it('returns correct redirect for known deprecated routes', () => {
      expect(getRedirectForRoute('/administration/departments')).toBe(
        '/administration/configuration?tab=departments'
      );
      expect(getRedirectForRoute('/administration/designations')).toBe(
        '/administration/configuration?tab=designations'
      );
      expect(getRedirectForRoute('/administration/dormitories')).toBe(
        '/administration/configuration?tab=dormitories'
      );
    });

    it('returns undefined for non-deprecated routes', () => {
      expect(getRedirectForRoute('/administration/students')).toBeUndefined();
      expect(getRedirectForRoute('/dashboard')).toBeUndefined();
      expect(getRedirectForRoute('/unknown/path')).toBeUndefined();
    });

    it('covers all Administration deprecated routes', () => {
      const adminRedirects = Object.entries(DEPRECATED_ROUTE_REDIRECTS).filter(
        ([path]) => path.startsWith('/administration/')
      );

      // We expect at least the core configuration redirects
      expect(adminRedirects.length).toBeGreaterThanOrEqual(6);

      // Verify all redirects point to valid administration routes (hub+tab or standalone)
      adminRedirects.forEach(([path, redirect]) => {
        expect(redirect).toMatch(/^\/administration\//);
      });
    });

    it('handles cross-module redirects', () => {
      expect(getRedirectForRoute('/hr/staff-bio-data')).toBe(
        '/administration/staff?tab=bio-data'
      );
    });
  });

  describe('DEPRECATED_ROUTE_REDIRECTS', () => {
    it('has no duplicate source paths', () => {
      const paths = Object.keys(DEPRECATED_ROUTE_REDIRECTS);
      const uniquePaths = new Set(paths);
      expect(uniquePaths.size).toBe(paths.length);
    });

    it('has no empty redirect destinations', () => {
      Object.values(DEPRECATED_ROUTE_REDIRECTS).forEach(redirect => {
        expect(redirect).toBeTruthy();
        expect(redirect.length).toBeGreaterThan(0);
      });
    });
  });
});
