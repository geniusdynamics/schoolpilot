// ABOUTME: Tests for SchoolConfigurationPage hub component
// ABOUTME: Verifies tab navigation, Content component rendering, and URL sync

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SchoolConfigurationPage from '../SchoolConfigurationPage';

const mockNavigate = vi.fn();
const mockSetSearchParams = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock('../DepartmentsPage', () => ({
  DepartmentsContent: () => <div data-testid="departments-content">Departments Content</div>,
}));

vi.mock('../DesignationsPage', () => ({
  DesignationsContent: () => <div data-testid="designations-content">Designations Content</div>,
}));

vi.mock('../StudentCategoriesPage', () => ({
  StudentCategoriesContent: () => <div data-testid="categories-content">Categories Content</div>,
}));

vi.mock('../PartnersPage', () => ({
  PartnersContent: () => <div data-testid="partners-content">Partners Content</div>,
}));

vi.mock('../ClubsPage', () => ({
  ClubsContent: () => <div data-testid="clubs-content">Clubs Content</div>,
}));

vi.mock('../DormitoriesPage', () => ({
  DormitoriesContent: () => <div data-testid="dormitories-content">Dormitories Content</div>,
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('SchoolConfigurationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the hub page with title and all tabs', () => {
    renderWithRouter(<SchoolConfigurationPage />);

    expect(screen.getByText('School Configuration')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Departments/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Designations/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clubs & Societies/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dormitories/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Student Categories/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Partners/i })).toBeInTheDocument();
  });

  it('shows Departments tab content by default', () => {
    renderWithRouter(<SchoolConfigurationPage />);

    expect(screen.getByTestId('departments-content')).toBeInTheDocument();
    expect(screen.queryByTestId('designations-content')).not.toBeInTheDocument();
  });

  it('switches to Designations tab when clicked', () => {
    renderWithRouter(<SchoolConfigurationPage />);

    const designationsTab = screen.getByRole('button', { name: /Designations/i });
    fireEvent.click(designationsTab);

    expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'designations' }, { replace: true });
  });

  it('switches to Clubs tab when clicked', () => {
    renderWithRouter(<SchoolConfigurationPage />);

    const clubsTab = screen.getByRole('button', { name: /Clubs & Societies/i });
    fireEvent.click(clubsTab);

    expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'clubs' }, { replace: true });
  });

  it('switches to Dormitories tab when clicked', () => {
    renderWithRouter(<SchoolConfigurationPage />);

    const dormitoriesTab = screen.getByRole('button', { name: /Dormitories/i });
    fireEvent.click(dormitoriesTab);

    expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'dormitories' }, { replace: true });
  });

  it('uses clean URL for Departments tab (no query param)', () => {
    renderWithRouter(<SchoolConfigurationPage />);

    const departmentsTab = screen.getByRole('button', { name: /Departments/i });
    fireEvent.click(departmentsTab);

    expect(mockNavigate).toHaveBeenCalledWith('/administration/configuration', { replace: true });
  });
});
