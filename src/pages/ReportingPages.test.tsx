import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SourceMethodCards } from './ReportingPages';

afterEach(cleanup);

describe('report input methods', () => {
  it('renders exactly four top-level method cards', () => {
    render(<SourceMethodCards selected={[]} onToggle={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.getByRole('button', { name: /Atlas Structured Form/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Document Upload/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /XLSX Upload/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Paste Email or Call Transcript/ })).toBeVisible();
  });

  it('keeps Email and Call Transcript inside one combined method', async () => {
    const onToggle = vi.fn();
    render(<SourceMethodCards selected={[]} onToggle={onToggle} />);
    const combined = screen.getByRole('button', { name: /Paste Email or Call Transcript/ });
    expect(screen.queryByRole('button', { name: 'Email' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Call Transcript' })).not.toBeInTheDocument();
    await userEvent.click(combined);
    expect(onToggle).toHaveBeenCalledWith('paste_email_or_transcript');
  });
});
