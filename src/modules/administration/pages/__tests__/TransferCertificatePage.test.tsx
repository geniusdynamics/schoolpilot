// ABOUTME: Tests that the Transfer Certificate page only offers learners who have left the school.

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudentStatus } from '@/core/types';
import type { Student } from '@/core/types';
import { TransferCertificateContent } from '../TransferCertificatePage';

const students: Student[] = [
  {
    id: 's-transferred',
    admission_no: 'ADM-001',
    first_name: 'Leaving',
    last_name: 'Learner',
    status: StudentStatus.TRANSFERRED,
    current_class_name: 'Grade 7',
    current_class_stream_name: 'Blue',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  } as Student,
  {
    id: 's-active',
    admission_no: 'ADM-002',
    first_name: 'Staying',
    last_name: 'Student',
    status: StudentStatus.ACTIVE,
    current_class_name: 'Grade 7',
    current_class_stream_name: 'Blue',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  } as Student,
];

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => ({ students, loading: { all: false } }),
}));

describe('TransferCertificateContent', () => {
  it('lists transferred learners and excludes active learners', () => {
    render(<TransferCertificateContent />);

    expect(screen.getByText('Leaving Learner')).toBeInTheDocument();
    expect(screen.queryByText('Staying Student')).not.toBeInTheDocument();
  });
});
