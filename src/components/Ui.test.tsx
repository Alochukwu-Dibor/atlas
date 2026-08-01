import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button, DataTable, Modal, StateView, StatusBadge } from './Ui';

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open review</Button>
      <Modal title="Review report" open={open} onClose={() => setOpen(false)}>
        <input aria-label="Review note" />
      </Modal>
    </>
  );
}

describe('shared UI primitives', () => {
  it('communicates status with a visible label', () => {
    render(<StatusBadge status="needs_clarification" />);
    expect(screen.getByText('Needs clarification')).toBeVisible();
  });

  it('supports keyboard-accessible table row activation', async () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        caption="Reports"
        headers={['Report']}
        rows={[[<>Operations weekly</>]]}
        onRowClick={onRowClick}
      />,
    );
    const row = screen.getByText('Operations weekly').closest('tr')!;
    row.focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledWith(0);
  });

  it('renders demonstrable non-happy states and actions', () => {
    render(
      <StateView
        type="error"
        title="Could not load report"
        message="Try again."
        action={<Button>Retry</Button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Could not load report' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
  });

  it('moves focus into dialogs, closes on Escape, and restores focus', async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Open review' });
    await user.click(trigger);
    expect(screen.getByRole('button', { name: 'Close modal' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
