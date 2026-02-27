import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DueDatePicker from '../components/DueDatePicker';
import { T } from '../i18n/translations';

describe('DueDatePicker', () => {
  const t = T.en;

  it('renders with no date set', () => {
    render(<DueDatePicker value="" onChange={() => {}} t={t} />);
    expect(screen.getByText(t.edDueDate)).toBeInTheDocument();
  });

  it('renders the date value when set', () => {
    render(<DueDatePicker value="2026-03-15" onChange={() => {}} t={t} />);
    // DueDatePicker formats dates as short month+day, e.g. "Mar 15"
    expect(screen.getByText(/Mar 15/)).toBeInTheDocument();
  });

  it('shows picker on click and has Today/Tomorrow buttons', () => {
    render(<DueDatePicker value="" onChange={() => {}} t={t} />);
    fireEvent.click(screen.getByText(t.edDueDate));
    expect(screen.getByText(t.dueDateToday)).toBeInTheDocument();
    expect(screen.getByText(t.dueDateTomorrow)).toBeInTheDocument();
  });

  it('calls onChange with today when Today clicked', () => {
    const onChange = vi.fn();
    render(<DueDatePicker value="" onChange={onChange} t={t} />);
    fireEvent.click(screen.getByText(t.edDueDate));
    fireEvent.click(screen.getByText(t.dueDateToday));
    expect(onChange).toHaveBeenCalledTimes(1);
    // Should be today's date in YYYY-MM-DD format
    expect(onChange.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
