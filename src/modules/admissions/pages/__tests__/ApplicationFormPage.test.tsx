// ABOUTME: Walks the four-step admissions application wizard and asserts the submitted payload.
// ABOUTME: Covers SO-15: every step renders its fields and required fields block progression.

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { ApplicationFormPageContent } from '../ApplicationFormPage';

const mockCreateApplication = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../data/useAdmissionsData', () => ({
  useAdmissionsData: () => ({ createApplication: mockCreateApplication }),
}));

const field = (name: string) => {
  const el = document.querySelector(`[name="${name}"]`);
  if (!el) throw new Error(`field "${name}" is not rendered`);
  return el as HTMLInputElement | HTMLSelectElement;
};

const type = (name: string, value: string) => {
  fireEvent.change(field(name), { target: { name, value } });
};

const clickNext = () => fireEvent.click(screen.getByRole('button', { name: /^Next/ }));

describe('ApplicationFormPage', () => {
  beforeEach(() => {
    mockCreateApplication.mockReset();
    mockCreateApplication.mockResolvedValue({ id: 'app-1' });
    mockNavigate.mockReset();
  });

  it('renders the student information fields on the first step', () => {
    render(<ApplicationFormPageContent />);

    for (const name of ['firstName', 'middleName', 'lastName', 'dateOfBirth', 'gender', 'intendedClassId']) {
      expect(field(name)).toBeInTheDocument();
    }
  });

  it('does not advance past a step while required fields are empty', async () => {
    render(<ApplicationFormPageContent />);

    clickNext();

    expect(await screen.findByRole('alert')).toHaveTextContent(/required/i);
    expect(field('firstName')).toBeInTheDocument();
    expect(document.querySelector('[name="guardianFirstName"]')).toBeNull();
  });

  it('walks all four steps and submits the complete application', async () => {
    render(<ApplicationFormPageContent />);

    // Step 1: student information
    type('firstName', 'Achieng');
    type('middleName', 'Wanjiru');
    type('lastName', 'Otieno');
    type('dateOfBirth', '2014-03-15');
    type('gender', 'Female');
    type('birthCertificateNumber', 'BC-123456');
    type('intendedClassId', 'form-1');
    type('academicYearId', 'ay-2027');
    clickNext();

    // Step 2: guardian information
    await waitFor(() => expect(field('guardianFirstName')).toBeInTheDocument());
    clickNext();
    expect(await screen.findByRole('alert')).toHaveTextContent(/required/i);
    expect(document.querySelector('[name="previousSchool"]')).toBeNull();

    type('guardianFirstName', 'Grace');
    type('guardianLastName', 'Otieno');
    type('guardianPhone', '+254700000001');
    type('guardianEmail', 'grace@example.com');
    type('county', 'Kisumu');
    clickNext();

    // Step 3: academic background (optional)
    await waitFor(() => expect(field('previousSchool')).toBeInTheDocument());
    expect(field('kcpeIndexNumber')).toBeInTheDocument();
    type('previousSchool', 'Kisumu Primary');
    type('previousClass', 'Grade 6');
    type('kcpeMarks', '389');
    clickNext();

    // Step 4: review shows the captured data
    expect(await screen.findByText('Review Application')).toBeInTheDocument();
    expect(screen.getByText('Achieng Wanjiru Otieno')).toBeInTheDocument();
    expect(screen.getByText('Grace Otieno')).toBeInTheDocument();
    expect(screen.getByText('Kisumu Primary')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Submit Application/ }));

    await waitFor(() => expect(mockCreateApplication).toHaveBeenCalledTimes(1));
    expect(mockCreateApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Achieng',
        middleName: 'Wanjiru',
        lastName: 'Otieno',
        dateOfBirth: '2014-03-15',
        gender: 'Female',
        birthCertificateNumber: 'BC-123456',
        intendedClassId: 'form-1',
        academicYearId: 'ay-2027',
        guardianFirstName: 'Grace',
        guardianLastName: 'Otieno',
        guardianPhone: '+254700000001',
        guardianEmail: 'grace@example.com',
        county: 'Kisumu',
        previousSchool: 'Kisumu Primary',
        previousClass: 'Grade 6',
        kcpeMarks: 389,
      })
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admissions/applications'));
  });
});
