import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

const Boom: React.FC = () => {
  throw new Error('boom');
};

describe('ErrorBoundary', () => {
  it('resets when the reset key changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="first">
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKey="second">
        <div>Recovered route</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Recovered route')).toBeInTheDocument();
  });
});
