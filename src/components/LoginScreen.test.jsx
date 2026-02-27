import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginScreen from '../components/LoginScreen';
import { T } from '../i18n/translations';

describe('LoginScreen', () => {
  const t = T.en;

  it('renders login button', () => {
    render(<LoginScreen onLogin={() => {}} t={t} />);
    expect(screen.getByText(t.loginBtn)).toBeInTheDocument();
  });

  it('renders tagline and features', () => {
    render(<LoginScreen onLogin={() => {}} t={t} />);
    expect(screen.getByText(t.loginTagline)).toBeInTheDocument();
    expect(screen.getByText(t.loginSync)).toBeInTheDocument();
    expect(screen.getByText(t.loginSpaces)).toBeInTheDocument();
    expect(screen.getByText(t.loginGraph)).toBeInTheDocument();
  });

  it('calls onLogin when button clicked', () => {
    const onLogin = vi.fn();
    render(<LoginScreen onLogin={onLogin} t={t} />);
    fireEvent.click(screen.getByText(t.loginBtn));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });
});
