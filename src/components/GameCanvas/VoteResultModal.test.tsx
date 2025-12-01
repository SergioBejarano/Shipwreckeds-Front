import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VoteResultModal from './VoteResultModal';
import type { Avatar, VoteResultPayload } from '../../utils/GameCanvas/types';

describe('VoteResultModal', () => {
  const mockAvatars: Avatar[] = [
    { id: 1, type: 'npc', displayName: 'NPC-1', ownerUsername: undefined, x: 0, y: 0 },
    { id: 2, type: 'human', displayName: 'Player-2', ownerUsername: 'player2', x: 0, y: 0 },
    { id: 3, type: 'npc', displayName: 'NPC-3', ownerUsername: undefined, x: 0, y: 0 },
  ];

  const mockGetDisplayName = (a: Avatar) => a.displayName || `${a.type}-${a.id}`;

  const mockGameState = { avatars: mockAvatars };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders vote result title', () => {
    const mockResult: VoteResultPayload = {
      counts: { '1': 3, '2': 1 },
      abstentions: 0,
      message: 'NPC-1 was expelled',
      expelledType: 'npc',
      publishedAtEpochMs: Date.now(),
    };
    const mockOnClose = vi.fn();

    render(
      <VoteResultModal
        result={mockResult}
        gameState={mockGameState}
        getDisplayName={mockGetDisplayName}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/resultados de la votación/i)).toBeInTheDocument();
  });

  it('displays vote counts for each avatar', () => {
    const mockResult: VoteResultPayload = {
      counts: { '1': 3, '2': 1, '3': 2 },
      abstentions: 0,
      message: 'NPC-1 was expelled',
      expelledType: 'npc',
      publishedAtEpochMs: Date.now(),
    };
    const mockOnClose = vi.fn();

    render(
      <VoteResultModal
        result={mockResult}
        gameState={mockGameState}
        getDisplayName={mockGetDisplayName}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('NPC-1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Player-2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('NPC-3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays abstention count when present', () => {
    const mockResult: VoteResultPayload = {
      counts: { '1': 2, '2': 2 },
      abstentions: 2,
      message: 'No consensus reached',
      expelledType: null,
      publishedAtEpochMs: Date.now(),
    };
    const mockOnClose = vi.fn();

    render(
      <VoteResultModal
        result={mockResult}
        gameState={mockGameState}
        getDisplayName={mockGetDisplayName}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/abstenciones/i)).toBeInTheDocument();
    const abstentionElements = screen.getAllByText('2');
    expect(abstentionElements.length).toBeGreaterThanOrEqual(1);
  });

  it('does not display abstentions row when count is 0', () => {
    const mockResult: VoteResultPayload = {
      counts: { '1': 3, '2': 1 },
      abstentions: 0,
      message: 'NPC-1 was expelled',
      expelledType: 'npc',
      publishedAtEpochMs: Date.now(),
    };
    const mockOnClose = vi.fn();

    render(
      <VoteResultModal
        result={mockResult}
        gameState={mockGameState}
        getDisplayName={mockGetDisplayName}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText(/abstenciones/i)).not.toBeInTheDocument();
  });

  it('displays result message', () => {
    const resultMessage = 'El NPC-1 ha sido expulsado de la isla';
    const mockResult: VoteResultPayload = {
      counts: { '1': 3 },
      abstentions: 0,
      message: resultMessage,
      expelledType: 'npc',
      publishedAtEpochMs: Date.now(),
    };
    const mockOnClose = vi.fn();

    render(
      <VoteResultModal
        result={mockResult}
        gameState={mockGameState}
        getDisplayName={mockGetDisplayName}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(resultMessage)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const mockResult: VoteResultPayload = {
      counts: { '1': 3 },
      abstentions: 0,
      message: 'Vote complete',
      expelledType: 'npc',
      publishedAtEpochMs: Date.now(),
    };
    const mockOnClose = vi.fn();

    render(
      <VoteResultModal
        result={mockResult}
        gameState={mockGameState}
        getDisplayName={mockGetDisplayName}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /cerrar/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it('handles avatars not found in gameState', () => {
    const mockResult: VoteResultPayload = {
      counts: { '999': 2 },
      abstentions: 1,
      message: 'Unknown avatar was expelled',
      expelledType: 'npc',
      publishedAtEpochMs: Date.now(),
    };
    const mockOnClose = vi.fn();

    render(
      <VoteResultModal
        result={mockResult}
        gameState={mockGameState}
        getDisplayName={mockGetDisplayName}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/npc-999/i)).toBeInTheDocument();
  });

  it('handles null gameState gracefully', () => {
    const mockResult: VoteResultPayload = {
      counts: { '1': 3 },
      abstentions: 0,
      message: 'Vote complete',
      expelledType: 'npc',
      publishedAtEpochMs: Date.now(),
    };
    const mockOnClose = vi.fn();

    render(
      <VoteResultModal
        result={mockResult}
        gameState={null}
        getDisplayName={mockGetDisplayName}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Vote complete')).toBeInTheDocument();
  });

  it('displays multiple votes for same avatar', () => {
    const mockResult: VoteResultPayload = {
      counts: { '1': 5 },
      abstentions: 0,
      message: 'NPC-1 expelled with majority',
      expelledType: 'npc',
      publishedAtEpochMs: Date.now(),
    };
    const mockOnClose = vi.fn();

    render(
      <VoteResultModal
        result={mockResult}
        gameState={mockGameState}
        getDisplayName={mockGetDisplayName}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
