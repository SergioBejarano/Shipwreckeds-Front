import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Lobby from './Lobby';
import * as apiModule from '../utils/api';
import type { Match } from '../utils/api';

vi.mock('../utils/api', () => ({
  getMatch: vi.fn(),
  startMatch: vi.fn(),
}));

vi.mock('../utils/useLobby', () => ({
  useLobby: vi.fn(),
}));

describe('Lobby', () => {
  const mockMatch: Match = {
    code: 'TEST123',
    players: [
      { id: 1, username: 'player1' },
      { id: 2, username: 'player2' },
      { id: 3, username: 'player3' },
      { id: 4, username: 'player4' },
      { id: 5, username: 'player5' },
    ],
    status: 'WAITING',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiModule.getMatch).mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<Lobby code="TEST123" currentUser="player1" isHost={true} />);
    
    expect(screen.getByText(/cargando lobby/i)).toBeInTheDocument();
  });

  it.skip('renders match code and player count after loading', async () => {
    vi.mocked(apiModule.getMatch).mockResolvedValue(mockMatch);
    render(<Lobby code="TEST123" currentUser="player1" isHost={true} />);
    
    await waitFor(() => {
      expect(screen.getByText(/código: test123/i)).toBeInTheDocument();
      expect(screen.getByText(/jugadores: 5/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it.skip('displays all players in the lobby', async () => {
    vi.mocked(apiModule.getMatch).mockResolvedValue(mockMatch);
    render(<Lobby code="TEST123" currentUser="player1" isHost={true} />);
    
    await waitFor(() => {
      expect(screen.getByText(/player1 \(tú\)/)).toBeInTheDocument();
      expect(screen.getByText('player2')).toBeInTheDocument();
      expect(screen.getByText('player3')).toBeInTheDocument();
      expect(screen.getByText('player4')).toBeInTheDocument();
      expect(screen.getByText('player5')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it.skip('shows start button for host', async () => {
    vi.mocked(apiModule.getMatch).mockResolvedValue(mockMatch);
    render(<Lobby code="TEST123" currentUser="player1" isHost={true} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /iniciar partida/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it.skip('shows waiting message for non-host', async () => {
    vi.mocked(apiModule.getMatch).mockResolvedValue(mockMatch);
    render(<Lobby code="TEST123" currentUser="player2" isHost={false} />);
    
    await waitFor(() => {
      expect(screen.getByText(/esperando al host/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it.skip('disables start button when less than 5 players', async () => {
    const matchWith3Players = { ...mockMatch, players: mockMatch.players.slice(0, 3) };
    vi.mocked(apiModule.getMatch).mockResolvedValue(matchWith3Players);
    render(<Lobby code="TEST123" currentUser="player1" isHost={true} />);
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /iniciar partida/i });
      expect(button).toBeDisabled();
      expect(screen.getByText(/se necesitan al menos 5 jugadores/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it.skip('enables start button when 5 or more players', async () => {
    vi.mocked(apiModule.getMatch).mockResolvedValue(mockMatch);
    render(<Lobby code="TEST123" currentUser="player1" isHost={true} />);
    
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /iniciar partida/i });
      expect(button).toBeEnabled();
    }, { timeout: 3000 });
  });

  it.skip('calls startMatch when host clicks start button', async () => {
    const user = userEvent.setup({ delay: null });
    const updatedMatch = { ...mockMatch, status: 'STARTED' };
    vi.mocked(apiModule.getMatch).mockResolvedValue(mockMatch);
    vi.mocked(apiModule.startMatch).mockResolvedValue(updatedMatch);
    
    render(<Lobby code="TEST123" currentUser="player1" isHost={true} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /iniciar partida/i })).toBeInTheDocument();
    }, { timeout: 3000 });
    
    const startButton = screen.getByRole('button', { name: /iniciar partida/i });
    await user.click(startButton);
    
    await waitFor(() => {
      expect(apiModule.startMatch).toHaveBeenCalledWith('TEST123', 'player1');
    }, { timeout: 3000 });
  });

  it.skip('calls onStartGame callback when match status is STARTED', async () => {
    const mockOnStartGame = vi.fn();
    const updatedMatch = { ...mockMatch, status: 'STARTED' };
    
    vi.mocked(apiModule.getMatch).mockResolvedValue(updatedMatch);
    render(<Lobby code="TEST123" currentUser="player1" isHost={true} onStartGame={mockOnStartGame} />);
    
    await waitFor(() => {
      expect(mockOnStartGame).toHaveBeenCalledWith(updatedMatch);
    }, { timeout: 3000 });
  });

  it.skip('handles API errors gracefully', async () => {
    const user = userEvent.setup({ delay: null });
    const errorMsg = 'Network error';
    vi.mocked(apiModule.getMatch).mockResolvedValue(mockMatch);
    vi.mocked(apiModule.startMatch).mockRejectedValue(new Error(errorMsg));
    
    window.alert = vi.fn();
    
    render(<Lobby code="TEST123" currentUser="player1" isHost={true} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /iniciar partida/i })).toBeInTheDocument();
    }, { timeout: 3000 });
    
    const startButton = screen.getByRole('button', { name: /iniciar partida/i });
    await user.click(startButton);
    
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error al iniciar partida: Network error');
    }, { timeout: 3000 });
  });

  it.skip('shows loading state on start button during API call', async () => {
    const user = userEvent.setup({ delay: null });
    vi.mocked(apiModule.getMatch).mockResolvedValue(mockMatch);
    vi.mocked(apiModule.startMatch).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<Lobby code="TEST123" currentUser="player1" isHost={true} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /iniciar partida/i })).toBeInTheDocument();
    }, { timeout: 3000 });
    
    const startButton = screen.getByRole('button', { name: /iniciar partida/i });
    await user.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /iniciando/i })).toBeDisabled();
    }, { timeout: 3000 });
  });

  it.skip('polls for match updates every 4 seconds', async () => {
    vi.useRealTimers();
    vi.mocked(apiModule.getMatch).mockResolvedValue(mockMatch);
    render(<Lobby code="TEST123" currentUser="player1" isHost={true} />);
    
    await waitFor(() => {
      expect(apiModule.getMatch).toHaveBeenCalled();
    }, { timeout: 3000 });
    
    const initialCallCount = (apiModule.getMatch as any).mock.calls.length;
    
    await new Promise(resolve => setTimeout(resolve, 4100));
    
    expect((apiModule.getMatch as any).mock.calls.length).toBeGreaterThan(initialCallCount);
    vi.useFakeTimers();
  });

  it.skip('shows match status as EN ESPERA', async () => {
    vi.mocked(apiModule.getMatch).mockResolvedValue(mockMatch);
    render(<Lobby code="TEST123" currentUser="player1" isHost={true} />);
    
    await waitFor(() => {
      expect(screen.getByText(/estado: en espera/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
