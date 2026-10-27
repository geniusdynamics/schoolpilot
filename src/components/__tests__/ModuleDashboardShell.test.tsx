// ABOUTME: Every module dashboard is drawn by this shell, and it opens as a compact banner like the main
// ABOUTME: dashboard's - a heading no bigger than the main one's, a small icon tile beside it, tight spacing.

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import ModuleDashboardShell from '../ModuleDashboardShell';

const renderShell = (props: Partial<React.ComponentProps<typeof ModuleDashboardShell>> = {}) =>
  render(
    <MemoryRouter>
      <ModuleDashboardShell
        title="Finance dashboard"
        subtitle="Billing, collections and outstanding fees."
        heroIcon={<svg data-testid="hero-icon" className="h-8 w-8 text-white" />}
        accentColor="violet"
        {...props}
      >
        <p>module content</p>
      </ModuleDashboardShell>
    </MemoryRouter>
  );

describe('ModuleDashboardShell', () => {
  describe('what it still shows', () => {
    it('names the dashboard in a level-one heading', () => {
      renderShell();

      expect(screen.getByRole('heading', { level: 1, name: 'Finance dashboard' })).toBeTruthy();
    });

    it('keeps the subtitle one hover or click away, behind its info hint', () => {
      renderShell();

      expect(screen.getByRole('button', { name: 'About this dashboard' })).toBeTruthy();
    });

    it('draws the module\'s own content under the banner', () => {
      renderShell();

      expect(screen.getByText('module content')).toBeTruthy();
    });

    it('draws its metrics', () => {
      renderShell({ metrics: [{ key: 'collected', label: 'Collected', value: 'KES 500' }] });

      expect(screen.getByText('Collected')).toBeTruthy();
      expect(screen.getByText('KES 500')).toBeTruthy();
    });
  });

  describe('as a compact banner, like the main dashboard\'s', () => {
    it('has a heading no larger than the main dashboard\'s', () => {
      renderShell();

      const heading = screen.getByRole('heading', { level: 1 });
      // The main dashboard's banner heading is text-lg, text-xl from the small breakpoint.
      expect(heading.className).toMatch(/\bsm:text-xl\b/);
      expect(heading.className).not.toMatch(/text-2xl|text-3xl/);
    });

    it('has a banner with the main dashboard\'s modest padding, not a roomy hero', () => {
      renderShell();

      const banner = screen.getByRole('heading', { level: 1 }).closest('section');
      expect(banner?.className).toMatch(/\bpy-3\b|\bpy-4\b/);
      expect(banner?.className).not.toMatch(/\bp-5\b|\bp-6\b|sm:p-6/);
    });

    it('puts the icon in a small tile before the heading, and sizes it itself', () => {
      renderShell();

      const icon = screen.getByTestId('hero-icon');
      const tile = icon.parentElement as HTMLElement;
      const heading = screen.getByRole('heading', { level: 1 });

      // The page hands the shell a 32px icon; the tile is what decides how big it is drawn.
      expect(tile.className).toMatch(/\bh-10\b/);
      expect(tile.className).toMatch(/\[&>svg\]:h-5/);
      // Before the heading in reading order, as on the main dashboard.
      expect(tile.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('keeps its sections closer together than the roomy layout did', () => {
      const { container } = renderShell();

      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toMatch(/\bspace-y-4\b/);
      expect(root.className).not.toMatch(/\bspace-y-6\b/);
    });

    it('draws no icon tile when the page supplies no icon', () => {
      renderShell({ heroIcon: undefined });

      expect(screen.queryByTestId('hero-icon')).toBeNull();
      expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    });
  });
});
