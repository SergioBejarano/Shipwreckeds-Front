import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EliminationOverlay } from './EliminationOverlay';

describe('EliminationOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when message is null', () => {
    const mockOnReturnToLobby = vi.fn();
    const { container } = render(<EliminationOverlay message={null} onReturnToLobby={mockOnReturnToLobby} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders elimination message when present', () => {
    const mockOnReturnToLobby = vi.fn();
    const message = 'You were voted out by the team';
    render(<EliminationOverlay message={message} onReturnToLobby={mockOnReturnToLobby} />);

    expect(screen.getByText(/has sido eliminado/i)).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('displays return to lobby button', () => {
    const mockOnReturnToLobby = vi.fn();
    render(<EliminationOverlay message="Eliminated" onReturnToLobby={mockOnReturnToLobby} />);

    expect(screen.getByRole('button', { name: /volver al lobby/i })).toBeInTheDocument();
  });

  it('calls onReturnToLobby when button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const mockOnReturnToLobby = vi.fn();
    render(<EliminationOverlay message="Eliminated" onReturnToLobby={mockOnReturnToLobby} />);

    const button = screen.getByRole('button', { name: /volver al lobby/i });
    await user.click(button);

    expect(mockOnReturnToLobby).toHaveBeenCalledOnce();
  });

  it('renders with correct CSS classes', () => {
    const mockOnReturnToLobby = vi.fn();
    const { container } = render(<EliminationOverlay message="Eliminated" onReturnToLobby={mockOnReturnToLobby} />);

    const overlay = container.querySelector('.elimination-overlay');
    expect(overlay).toBeInTheDocument();
  });

  it('conditionally renders based on message prop changes', () => {
    const mockOnReturnToLobby = vi.fn();
    const { container, rerender } = render(<EliminationOverlay message={null} onReturnToLobby={mockOnReturnToLobby} />);

    expect(container.firstChild).toBeNull();

    rerender(<EliminationOverlay message="Now eliminated" onReturnToLobby={mockOnReturnToLobby} />);

    expect(screen.getByText('Now eliminated')).toBeInTheDocument();
  });

  it('renders different messages', () => {
    const mockOnReturnToLobby = vi.fn();
    const messages = [
      'Fuiste votado por el equipo',
      'El infiltrado te eliminó',
      'Sabotaje exitoso',
    ];

    messages.forEach((msg) => {
      const { unmount } = render(<EliminationOverlay message={msg} onReturnToLobby={mockOnReturnToLobby} />);
      expect(screen.getByText(msg)).toBeInTheDocument();
      unmount();
    });
  });

  it('has button with correct button type', () => {
    const mockOnReturnToLobby = vi.fn();
    render(<EliminationOverlay message="Eliminated" onReturnToLobby={mockOnReturnToLobby} />);

    const button = screen.getByRole('button', { name: /volver al lobby/i });
    expect(button).toHaveAttribute('type', 'button');
  });
});
