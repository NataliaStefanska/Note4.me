import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import IntentPrompt from '../components/IntentPrompt';
import { T } from '../i18n/translations';

describe('IntentPrompt', () => {
  const t = T.en;

  it('renders question and buttons', () => {
    render(<IntentPrompt onConfirm={() => {}} onSkip={() => {}} t={t} />);
    expect(screen.getByText(t.intentQ)).toBeInTheDocument();
    expect(screen.getByText(t.intentSkip)).toBeInTheDocument();
    expect(screen.getByText(t.intentOk)).toBeInTheDocument();
  });

  it('calls onSkip when skip button clicked', () => {
    const onSkip = vi.fn();
    render(<IntentPrompt onConfirm={() => {}} onSkip={onSkip} t={t} />);
    fireEvent.click(screen.getByText(t.intentSkip));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm with text when confirm clicked', () => {
    const onConfirm = vi.fn();
    render(<IntentPrompt onConfirm={onConfirm} onSkip={() => {}} t={t} />);
    const input = screen.getByPlaceholderText(t.intentPh);
    fireEvent.change(input, { target: { value: 'My intent' } });
    fireEvent.click(screen.getByText(t.intentOk));
    expect(onConfirm).toHaveBeenCalledWith('My intent');
  });

  it('renders placeholder text', () => {
    render(<IntentPrompt onConfirm={() => {}} onSkip={() => {}} t={t} />);
    expect(screen.getByPlaceholderText(t.intentPh)).toBeInTheDocument();
  });
});
