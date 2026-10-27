// ABOUTME: Tests for the centralized redirect map
// ABOUTME: Ensures all deprecated routes resolve to correct hub+tab destinations

import { describe, it, expect } from 'vitest';
import { MODULE_DASHBOARD_ROOTS } from '@/services/tabs/moduleDashboardUrl';
import { DEPRECATED_ROUTE_REDIRECTS, getRedirectForRoute } from '../redirectMap';

describe('redirectMap', () => {
  describe('getRedirectForRoute', () => {
    it('returns correct redirect for known deprecated routes', () => {
      expect(getRedirectForRoute('/administration/departments')).toBe(
        '/administration/organization?tab=departments'
      );
      expect(getRedirectForRoute('/administration/designations')).toBe(
        '/administration/organization?tab=designations'
      );
      expect(getRedirectForRoute('/administration/dormitories')).toBe(
        '/administration/student-life?tab=dormitories'
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

      // Verify redirects point at valid routes. Most stay inside
      // /administration; a few intentionally cross modules (e.g. Applications
      // moved to the Admissions module).
      adminRedirects.forEach(([, redirect]) => {
        expect(redirect).toMatch(/^\//);
        expect(redirect).not.toMatch(/undefined/);
      });

      // Cross-module moves
      expect(getRedirectForRoute('/administration/applications')).toBe(
        '/admissions/applications-hub'
      );
    });

    it("sends each module dashboard's old /module/dashboard address to the module root", () => {
      for (const moduleId of MODULE_DASHBOARD_ROOTS) {
        expect(getRedirectForRoute(`/${moduleId}/dashboard`)).toBe(`/${moduleId}`);
      }
    });

    it('sends the old settings dashboard address to the module root, not into a hub tab', () => {
      expect(getRedirectForRoute('/settings/dashboard')).toBe('/settings');
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
