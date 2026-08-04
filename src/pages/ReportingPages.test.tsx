import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SourceMethodCards } from './ReportingPages';

afterEach(cleanup);

describe('report input methods', () => {
  it('renders exactly four top-level method cards', () => {
    render(<SourceMethodCards selected={[]} onToggle={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.getByRole('button', { name: /Structured form/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Report upload/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Spreadsheet upload/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Manual entry or pasted transcript/ })).toBeVisible();
  });

  it('keeps Email and Call Transcript inside one combined method', async () => {
    const onToggle = vi.fn();
    render(<SourceMethodCards selected={[]} onToggle={onToggle} />);
    const combined = screen.getByRole('button', { name: /Manual entry or pasted transcript/ });
    expect(screen.queryByRole('button', { name: 'Email' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Call Transcript' })).not.toBeInTheDocument();
    await userEvent.click(combined);
    expect(onToggle).toHaveBeenCalledWith('paste_email_or_transcript');
  });
});
