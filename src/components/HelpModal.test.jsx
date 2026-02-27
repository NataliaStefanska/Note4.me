import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HelpModal from '../components/HelpModal';
import { T } from '../i18n/translations';

describe('HelpModal', () => {
  const t = T.en;

  it('renders help title and close button', () => {
    render(<HelpModal onClose={() => {}} t={t} />);
    expect(screen.getByText(t.helpTitle)).toBeInTheDocument();
    expect(screen.getByText(t.helpClose)).toBeInTheDocument();
  });

  it('shows editing and linking sections', () => {
    render(<HelpModal onClose={() => {}} t={t} />);
    expect(screen.getByText(t.helpEditing)).toBeInTheDocument();
    expect(screen.getByText(t.helpLinking)).toBeInTheDocument();
    expect(screen.getByText(t.helpFeatures)).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<HelpModal onClose={onClose} t={t} />);
    fireEvent.click(screen.getByText(t.helpClose));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<HelpModal onClose={onClose} t={t} />);
    // Click on the overlay (outermost div)
    fireEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalled();
  });
});
