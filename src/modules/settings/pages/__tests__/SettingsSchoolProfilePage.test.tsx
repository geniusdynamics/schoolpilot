// ABOUTME: Tests that Settings › School Profile loads and saves the single school_details record.
// ABOUTME: Uses an in-memory school_details collection behind a mocked databaseService (SO-17, probe C15).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const toast = vi.hoisted(() => ({ showSuccess: vi.fn(), showError: vi.fn() }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));

const store = vi.hoisted(() => {
  const rows = new Map<string, any>();
  const collection = {
    find: async () => Array.from(rows.values()),
    findById: async (id: string) => rows.get(id) ?? null,
    insert: vi.fn(async (doc: any) => {
      rows.set(doc.id, { ...doc });
      return rows.get(doc.id);
    }),
    update: vi.fn(async (id: string, patch: any) => {
      const existing = rows.get(id);
      if (!existing) throw new Error(`school_details ${id} not found`);
      rows.set(id, { ...existing, ...patch });
      return rows.get(id);
    }),
  };
  return { rows, collection };
});

vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: async () => ({
      getCollection: (name: string) => (name === 'school_details' ? store.collection : null),
    }),
    generateId: () => 'generated-school-id',
  },
}));

import SettingsSchoolProfilePage from '../SettingsSchoolProfilePage';

const nameInput = async () => {
  await screen.findByText('schoolProfile.saveButton');
  return document.querySelector('input[name="name"]') as HTMLInputElement;
};

describe('SettingsSchoolProfilePage', () => {
  beforeEach(() => {
    store.rows.clear();
    store.collection.insert.mockClear();
    store.collection.update.mockClear();
    toast.showSuccess.mockClear();
    toast.showError.mockClear();
  });

  it('creates the school_details record on first save', async () => {
    render(<SettingsSchoolProfilePage />);
    fireEvent.change(await nameInput(), { target: { name: 'name', value: 'Probe Academy' } });
    fireEvent.click(screen.getByText('schoolProfile.saveButton'));

    await waitFor(() => expect(toast.showSuccess).toHaveBeenCalled());
    expect(toast.showError).not.toHaveBeenCalled();
    const saved = Array.from(store.rows.values());
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('Probe Academy');
  });

  it('loads the existing profile and updates it in place', async () => {
    store.rows.set('school-1', { id: 'school-1', name: 'Old Name', school_code: 'S001' });
    render(<SettingsSchoolProfilePage />);

    const input = await nameInput();
    await waitFor(() => expect(input.value).toBe('Old Name'));
    fireEvent.change(input, { target: { name: 'name', value: 'New Name' } });
    fireEvent.click(screen.getByText('schoolProfile.saveButton'));

    await waitFor(() => expect(toast.showSuccess).toHaveBeenCalled());
    expect(store.collection.insert).not.toHaveBeenCalled();
    expect(store.rows.size).toBe(1);
    expect(store.rows.get('school-1')).toMatchObject({ name: 'New Name', school_code: 'S001' });
  });

  it('saves the admission-number format and its section overrides', async () => {
    render(<SettingsSchoolProfilePage />);
    fireEvent.change(await nameInput(), { target: { name: 'name', value: 'Probe Academy' } });

    fireEvent.change(document.querySelector('input[name="admission_number_prefix"]')!, {
      target: { name: 'admission_number_prefix', value: 'PRI' },
    });
    fireEvent.change(document.querySelector('input[name="admission_number_width"]')!, {
      target: { name: 'admission_number_width', value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add section' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Junior Secondary'), {
      target: { value: 'Junior Secondary' },
    });
    const [sectionPrefix, sectionSuffix] = screen.getAllByPlaceholderText('Inherit');
    fireEvent.change(sectionPrefix, { target: { value: 'JSS' } });
    fireEvent.change(sectionSuffix, { target: { value: 'P' } });

    fireEvent.click(screen.getByText('schoolProfile.saveButton'));

    await waitFor(() => expect(toast.showSuccess).toHaveBeenCalled());
    const saved = Array.from(store.rows.values())[0];
    expect(saved).toMatchObject({
      admission_number_prefix: 'PRI',
      admission_number_width: '2',
    });
    expect(JSON.parse(saved.admission_number_sections)).toEqual([
      { name: 'Junior Secondary', prefix: 'JSS', suffix: 'P' },
    ]);
  });

  it('keeps the section explanation on the card heading instead of a description row', async () => {
    render(<SettingsSchoolProfilePage />);
    await screen.findByText('schoolProfile.saveButton');

    // The sentence moved off the page body onto the heading, so it is still in the DOM — reachable
    // from the info hint rather than spent on a row above the form.
    const hint = screen.getByRole('button', { name: 'About this section' });
    expect(hint).toBeInTheDocument();
    expect(screen.getByText('schoolProfile.description')).toBeInTheDocument();
  });
});
