import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import VoteModal from './VoteModal';
import type { Avatar } from '../../utils/GameCanvas/types';

describe('VoteModal', () => {
  const mockAvatars: Avatar[] = [
    { id: 1, type: 'npc', displayName: 'NPC-1', ownerUsername: undefined },
    { id: 2, type: 'human', displayName: 'Player-2', ownerUsername: 'player2' },
    { id: 3, type: 'npc', displayName: 'NPC-3', ownerUsername: undefined },
  ];

  const mockGetDisplayName = (a: Avatar) => a.displayName || `${a.type}-${a.id}`;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders vote options for regular players', () => {
    const mockOnVote = vi.fn();
    const { container } = render(
      <VoteModal
        options={mockAvatars}
        hasVoted={false}
        onVote={mockOnVote}
        onClose={vi.fn()}
        getDisplayName={mockGetDisplayName}
        isInfiltrator={false}
        durationSeconds={20}
      />
    );

    expect(screen.getByText(/elige un npc para expulsar/i)).toBeInTheDocument();
    // Check that vote buttons exist
    const voteButtons = screen.getAllByRole('button', { name: /votar/i });
    expect(voteButtons.length).toBeGreaterThanOrEqual(3);
    // Check that the modal contains the avatar display names via container check
    expect(container.textContent).toContain('NPC-1');
    expect(container.textContent).toContain('Player-2');
    expect(container.textContent).toContain('NPC-3');
  });

  it('shows abstain option for regular players', () => {
    const mockOnVote = vi.fn();
    render(
      <VoteModal
        options={mockAvatars}
        hasVoted={false}
        onVote={mockOnVote}
        onClose={vi.fn()}
        getDisplayName={mockGetDisplayName}
        isInfiltrator={false}
        durationSeconds={20}
      />
    );

    expect(screen.getByText(/abstenerme/i)).toBeInTheDocument();
  });

  it('displays remaining time countdown', () => {
    const mockOnVote = vi.fn();
    render(
      <VoteModal
        options={mockAvatars}
        hasVoted={false}
        onVote={mockOnVote}
        onClose={vi.fn()}
        getDisplayName={mockGetDisplayName}
        isInfiltrator={false}
        durationSeconds={15}
      />
    );

    expect(screen.getByText(/tiempo restante:/i)).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('calls onVote with target ID when voting for avatar', async () => {
    vi.useRealTimers();
    const user = userEvent.setup({ delay: null });
    const mockOnVote = vi.fn();
    render(
      <VoteModal
        options={mockAvatars}
        hasVoted={false}
        onVote={mockOnVote}
        onClose={vi.fn()}
        getDisplayName={mockGetDisplayName}
        isInfiltrator={false}
        durationSeconds={20}
      />
    );

    const voteButtons = screen.getAllByRole('button', { name: /votar/i });
    await user.click(voteButtons[0]);

    expect(mockOnVote).toHaveBeenCalledWith(mockAvatars[0].id);
    vi.useFakeTimers();
  });

  it('calls onVote with -1 when abstaining', async () => {
    vi.useRealTimers();
    const user = userEvent.setup({ delay: null });
    const mockOnVote = vi.fn();
    render(
      <VoteModal
        options={mockAvatars}
        hasVoted={false}
        onVote={mockOnVote}
        onClose={vi.fn()}
        getDisplayName={mockGetDisplayName}
        isInfiltrator={false}
        durationSeconds={20}
      />
    );

    const abstainButton = screen.getByRole('button', { name: /abstenerme/i });
    await user.click(abstainButton);

    expect(mockOnVote).toHaveBeenCalledWith(-1);
    vi.useFakeTimers();
  });

  it('disables vote buttons after voting', async () => {
    vi.useRealTimers();
    const user = userEvent.setup({ delay: null });
    const mockOnVote = vi.fn();
    const { rerender } = render(
      <VoteModal
        options={mockAvatars}
        hasVoted={false}
        onVote={mockOnVote}
        onClose={vi.fn()}
        getDisplayName={mockGetDisplayName}
        isInfiltrator={false}
        durationSeconds={20}
      />
    );

    let voteButtons = screen.getAllByRole('button', { name: /votar/i });
    await user.click(voteButtons[0]);

    rerender(
      <VoteModal
        options={mockAvatars}
        hasVoted={true}
        onVote={mockOnVote}
        onClose={vi.fn()}
        getDisplayName={mockGetDisplayName}
        isInfiltrator={false}
        durationSeconds={20}
      />
    );

    voteButtons = screen.getAllByRole('button', { name: /votar/i });
    for (const btn of voteButtons) {
      expect(btn).toBeDisabled();
    }
    vi.useFakeTimers();
  });

  it('shows infiltrator message when isInfiltrator is true', () => {
    const mockOnVote = vi.fn();
    render(
      <VoteModal
        options={mockAvatars}
        hasVoted={false}
        onVote={mockOnVote}
        onClose={vi.fn()}
        getDisplayName={mockGetDisplayName}
        isInfiltrator={true}
        durationSeconds={20}
      />
    );

    expect(screen.getByText(/ha iniciado una votación/i)).toBeInTheDocument();
    expect(screen.queryByText(/elige un npc/i)).not.toBeInTheDocument();
  });

  it('does not show voting options for infiltrators', () => {
    const mockOnVote = vi.fn();
    render(
      <VoteModal
        options={mockAvatars}
        hasVoted={false}
        onVote={mockOnVote}
        onClose={vi.fn()}
        getDisplayName={mockGetDisplayName}
        isInfiltrator={true}
        durationSeconds={20}
      />
    );

    expect(screen.queryByRole('button', { name: /votar/i })).not.toBeInTheDocument();
  });

  it('counts down timer every second', async () => {
    vi.useRealTimers();
    const mockOnVote = vi.fn();
    render(
      <VoteModal
        options={mockAvatars}
        hasVoted={false}
        onVote={mockOnVote}
        onClose={vi.fn()}
        getDisplayName={mockGetDisplayName}
        isInfiltrator={false}
        durationSeconds={3}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();

    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(screen.getByText('2')).toBeInTheDocument();

    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(screen.getByText('1')).toBeInTheDocument();
    
    vi.useFakeTimers();
  });

  it('auto-votes with -1 (abstain) when timer expires for non-infiltrator', async () => {
    vi.useRealTimers();
    const mockOnVote = vi.fn();
    render(
      <VoteModal
        options={mockAvatars}
        hasVoted={false}
        onVote={mockOnVote}
        onClose={vi.fn()}
        getDisplayName={mockGetDisplayName}
        isInfiltrator={false}
        durationSeconds={1}
      />
    );

    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(mockOnVote).toHaveBeenCalledWith(-1);
    
    vi.useFakeTimers();
  });

  it('does not auto-vote when infiltrator', async () => {
    const mockOnVote = vi.fn();
    render(
      <VoteModal
        options={mockAvatars}
        hasVoted={false}
        onVote={mockOnVote}
        onClose={vi.fn()}
        getDisplayName={mockGetDisplayName}
        isInfiltrator={true}
        durationSeconds={2}
      />
    );

    vi.advanceTimersByTime(2000);

    expect(mockOnVote).not.toHaveBeenCalled();
  });

  it('does not auto-vote if already voted', async () => {
    const mockOnVote = vi.fn();
    render(
      <VoteModal
        options={mockAvatars}
        hasVoted={true}
        onVote={mockOnVote}
        onClose={vi.fn()}
        getDisplayName={mockGetDisplayName}
        isInfiltrator={false}
        durationSeconds={2}
      />
    );

    vi.advanceTimersByTime(2000);

    expect(mockOnVote).not.toHaveBeenCalled();
  });

  it('renders with correct modal attributes', () => {
    const mockOnVote = vi.fn();
    const { container } = render(
      <VoteModal
        options={mockAvatars}
        hasVoted={false}
        onVote={mockOnVote}
        onClose={vi.fn()}
        getDisplayName={mockGetDisplayName}
        isInfiltrator={false}
        durationSeconds={20}
      />
    );

    const modal = container.querySelector('[role="dialog"]');
    expect(modal).toHaveAttribute('aria-modal', 'true');
  });
});
