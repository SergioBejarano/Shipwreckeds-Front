import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateJoin from './CreateJoin';
import { createMatch, joinMatch, logout as logoutApi } from '../utils/api';
import type { Match } from '../utils/api';

vi.mock('../utils/api', () => ({
  createMatch: vi.fn(),
  joinMatch: vi.fn(),
  logout: vi.fn(),
}));

describe('CreateJoin', () => {
  const onEnterLobby = vi.fn();
  const onLogout = vi.fn();
  const username = 'ana';

  beforeEach(() => {
    vi.clearAllMocks();
    onEnterLobby.mockReset();
    onLogout.mockReset();
  });

  it('crea partida y navega al lobby', async () => {
    vi.mocked(createMatch).mockResolvedValueOnce({ code: 'ABCD12' });

    render(<CreateJoin username={username} onEnterLobby={onEnterLobby} onLogout={onLogout} />);

    await userEvent.click(screen.getByRole('button', { name: /crear partida/i }));

    expect(createMatch).toHaveBeenCalledWith(username);
    await waitFor(() => expect(onEnterLobby).toHaveBeenCalledWith('ABCD12', true));
  });

  it('muestra error si intenta unirse sin código', async () => {
    render(<CreateJoin username={username} onEnterLobby={onEnterLobby} onLogout={onLogout} />);

    await userEvent.click(screen.getByRole('button', { name: /unirse a partida/i }));

    expect(screen.getByText(/ingresa un código/i)).toBeInTheDocument();
    expect(joinMatch).not.toHaveBeenCalled();
  });

  it('convierte código a mayúsculas al unirse', async () => {
    vi.mocked(joinMatch).mockResolvedValueOnce({ code: 'MBHW38', players: [] } as Match);

    render(<CreateJoin username={username} onEnterLobby={onEnterLobby} onLogout={onLogout} />);

    fireEvent.change(screen.getByPlaceholderText(/código de partida/i), { target: { value: 'mbhw38' } });
    await userEvent.click(screen.getByRole('button', { name: /unirse a partida/i }));

    expect(joinMatch).toHaveBeenCalledWith('MBHW38', username);
    expect(onEnterLobby).toHaveBeenCalledWith('MBHW38', false);
  });

  it('cierra sesión usando api y callback', async () => {
    vi.mocked(logoutApi).mockResolvedValueOnce(undefined);

    render(<CreateJoin username={username} onEnterLobby={onEnterLobby} onLogout={onLogout} />);

    await userEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    expect(logoutApi).toHaveBeenCalledWith(username);
    await waitFor(() => expect(onLogout).toHaveBeenCalled());
  });
});
