import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SemaphoreIndicator from '../components/SemaphoreIndicator';
import { SemaphoreStatus } from '../utils/types';
import Header from '../components/Header';

describe('SemaphoreIndicator', () => {
  it('renders the status text', () => {
    render(<SemaphoreIndicator status={SemaphoreStatus.Green} />);
    expect(screen.getByText('Verde')).toBeInTheDocument();
  });

  it('has role status for screen readers', () => {
    render(<SemaphoreIndicator status={SemaphoreStatus.Red} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('includes aria-label with status', () => {
    render(<SemaphoreIndicator status={SemaphoreStatus.Yellow} />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-label', 'Estado: Amarillo');
  });
});

describe('Header', () => {
  it('renders the app title', () => {
    render(<Header />);
    expect(screen.getByText('Semáforo Cívico')).toBeInTheDocument();
  });
});
