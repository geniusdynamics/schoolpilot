// ABOUTME: Tests the printable report header: school name, address and contacts from school_details.
// ABOUTME: Renders nothing when no school profile has been saved yet.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const fake = await vi.hoisted(async () => {
  const { createFakeDatabaseService } = await import('@/tests/utils/schoolDetailsDb');
  return { current: createFakeDatabaseService() };
});
vi.mock('@/services/database/databaseService', () => ({ databaseService: fake.current.databaseService }));

import SchoolLetterhead from '../SchoolLetterhead';

describe('SchoolLetterhead', () => {
  beforeEach(() => fake.current.collections.school_details.seed([]));

  it('shows the saved school name, address, contacts and the report title', async () => {
    fake.current.collections.school_details.seed([{
      id: 's1', name: 'Probe Academy', postal_address: 'P.O. Box 1', town: 'Nairobi', telephone: '0700', email: 'info@probe.ke',
    }]);
    render(<SchoolLetterhead title="Fee Collection Summary" />);
    expect(await screen.findByText('Probe Academy')).toBeTruthy();
    expect(screen.getByText('P.O. Box 1, Nairobi')).toBeTruthy();
    expect(screen.getByText('0700 | info@probe.ke')).toBeTruthy();
    expect(screen.getByText('Fee Collection Summary')).toBeTruthy();
  });

  it('renders nothing without a saved profile', async () => {
    const { container } = render(<SchoolLetterhead title="Report" />);
    await waitFor(() => expect(container.querySelector('[data-testid="school-letterhead"]')).toBeNull());
  });
});
