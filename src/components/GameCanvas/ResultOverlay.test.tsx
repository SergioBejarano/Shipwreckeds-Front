import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResultOverlay } from './ResultOverlay';

describe('ResultOverlay', () => {
  it('no renderiza cuando no está abierto', () => {
    const { container } = render(<ResultOverlay isOpen={false} winnerMessage="Ganaron" onConfirm={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('muestra mensaje y dispara confirmación', () => {
    const onConfirm = vi.fn();
    render(<ResultOverlay isOpen winnerMessage="Victoria" onConfirm={onConfirm} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/victoria/i)).toBeInTheDocument();

    screen.getByRole('button', { name: /aceptar/i }).click();
    expect(onConfirm).toHaveBeenCalled();
  });
});
