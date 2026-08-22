// ABOUTME: Minimal test to isolate DOM element issue
// ABOUTME: Simple test to verify basic render functionality

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

const SimpleComponent = () => {
  return <div>Hello World</div>;
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

describe('Minimal Test', () => {
  it('should render a simple component', () => {
    render(
      <TestWrapper>
        <SimpleComponent />
      </TestWrapper>
    );
    
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});