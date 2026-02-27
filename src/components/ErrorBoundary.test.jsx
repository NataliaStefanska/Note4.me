import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';

function ThrowError() {
  throw new Error('Test error');
}

function GoodChild() {
  return <div>All good</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(<ErrorBoundary><GoodChild /></ErrorBoundary>);
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><ThrowError /></ErrorBoundary>);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Reload app')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('renders error details text', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><ThrowError /></ErrorBoundary>);
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
    spy.mockRestore();
  });
});
