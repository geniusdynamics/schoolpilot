// ABOUTME: Tests the header's global learner finder: debounced canonical search and a profile link.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const list = vi.hoisted(() => vi.fn());

vi.mock('@/data/canonicalRepository', () => ({
  openCanonicalRepository: async () => ({ list }),
}));

import GlobalStudentSearch from '../GlobalStudentSearch';

describe('GlobalStudentSearch', () => {
  beforeEach(() => {
    list.mockReset();
    list.mockResolvedValue({
      items: [
        {
          id: 'learner-1',
          admission_number: 'ADM/2027/012',
          given_name: 'Amina',
          family_name: 'Wanjiku',
        },
      ],
      total: 1,
      hasMore: false,
    });
  });

  it('searches by name and links to the learner profile', async () => {
    const user = userEvent.setup();
    render(<GlobalStudentSearch />);

    await user.type(screen.getByLabelText('Search learners by name or admission number'), 'ami');

    const result = await screen.findByRole('option', { name: /Amina Wanjiku/ });
    expect(result).toHaveAttribute('href', '/administration/students/learner-1');
    await waitFor(() => expect(list).toHaveBeenCalledWith(
      'learner',
      expect.objectContaining({ search: expect.objectContaining({ term: 'ami' }) })
    ));
  });

  it('does not search until two characters are typed', async () => {
    const user = userEvent.setup();
    render(<GlobalStudentSearch />);

    await user.type(screen.getByLabelText('Search learners by name or admission number'), 'a');

    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(list).not.toHaveBeenCalled();
  });
});
