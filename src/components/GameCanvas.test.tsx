import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import type { ReactElement } from 'react';
import GameCanvas from './GameCanvas';
import type { Avatar, GameState, VoteResultPayload } from '../utils/GameCanvas/types';

const bootstrapStateStore: { current: GameState | null } = { current: null };
let bootstrapApplied = false;
const handleFuelAction = vi.fn();

const fuelControlsState = {
  fuelPercentage: 42,
  fuelWindowOpen: false,
  fuelWindowSecondsRemaining: 0,
  fuelWindowMessage: null as string | null,
  isGameFinished: false,
  isNearBoat: false,
  isInfiltrator: false,
  fuelActionPending: false,
  handleFuelAction,
};

vi.mock('./GameCanvas/useStompClient', () => ({ useStompClient: vi.fn() }));
vi.mock('./GameCanvas/useBarcoImage', () => ({ useBarcoImage: vi.fn() }));
vi.mock('../utils/GameCanvas/useGameLoop', () => ({ useGameLoop: vi.fn() }));

const movementHandlers = {
  handleCanvasClick: vi.fn(),
  handleMouseMove: vi.fn(),
  cursorRef: { current: null as { x: number; y: number } | null },
};
vi.mock('../utils/GameCanvas/useMovement', () => ({
  useMovement: vi.fn(() => movementHandlers),
}));

vi.mock('./GameCanvas/hooks/useInitialMatchBootstrap', () => ({
  useInitialMatchBootstrap: vi.fn((matchCode: string, currentUser: string, setGameState: (state: GameState | null) => void, myAvatarIdRef: { current: number | null }) => {
    if (!bootstrapApplied && bootstrapStateStore.current) {
      setGameState(bootstrapStateStore.current);
      const mine = bootstrapStateStore.current.avatars.find((avatar) => avatar.ownerUsername === currentUser && avatar.type === 'human');
      if (mine && myAvatarIdRef) {
        myAvatarIdRef.current = mine.id;
      }
      bootstrapApplied = true;
    }
  }),
}));

vi.mock('./GameCanvas/hooks/useInfiltratorTracking', () => ({ useInfiltratorTracking: vi.fn() }));
vi.mock('./GameCanvas/hooks/useCompletionNotifier', () => ({ useCompletionNotifier: vi.fn() }));
vi.mock('./GameCanvas/hooks/useEliminationWatcher', () => ({ useEliminationWatcher: vi.fn() }));
vi.mock('./GameCanvas/hooks/useEliminationRedirect', () => ({ useEliminationRedirect: vi.fn() }));
vi.mock('./GameCanvas/hooks/useCanvasEvents', () => ({ useCanvasEvents: vi.fn() }));
vi.mock('./GameCanvas/hooks/useNpcAliasRegistry', () => ({ useNpcAliasRegistry: vi.fn() }));
vi.mock('./GameCanvas/hooks/useFuelControls', () => ({
  useFuelControls: vi.fn(() => fuelControlsState),
}));
vi.mock('./GameCanvas/hooks/useEliminationInteraction', () => ({
  useEliminationInteraction: vi.fn(() => ({ handleEliminationClick: vi.fn() })),
}));

vi.mock('./GameCanvas/FuelPanel', () => ({
  FuelPanel: (props: { fuelPercentage: number }): ReactElement => (
    <div data-testid="fuel-panel">Combustible: {props.fuelPercentage}%</div>
  ),
}));
vi.mock('./GameCanvas/ResultOverlay', () => ({ ResultOverlay: () => <div data-testid="result-overlay" /> }));
vi.mock('./GameCanvas/EliminationOverlay', () => ({ EliminationOverlay: () => <div data-testid="elimination-overlay" /> }));

const renderComponent = (overrideProps?: Partial<React.ComponentProps<typeof GameCanvas>>) => (
  render(
    <GameCanvas
      matchCode="MATCH-999"
      currentUser="alice"
      onExitToMenu={vi.fn()}
      {...overrideProps}
    />
  )
);

const buildAvatars = (): Avatar[] => ([
  { id: 1, type: 'human', ownerUsername: 'alice', x: 0, y: 0, isAlive: true },
  { id: 2, type: 'npc', ownerUsername: null, x: 5, y: 5, isAlive: true, displayName: 'NPC-2' },
  { id: 3, type: 'npc', ownerUsername: null, x: -5, y: 2, isAlive: true },
]);

const buildGameState = (overrides?: Partial<GameState>): GameState => ({
  code: 'MATCH-999',
  timestamp: Date.now(),
  avatars: buildAvatars(),
  island: { cx: 0, cy: 0, radius: 100 },
  voteOptions: null,
  votingActive: false,
  voteEndsAtEpochMs: undefined,
  lastVoteResult: null,
  lastVoteResultEpochMs: undefined,
  ...overrides,
});

const flushBootstrap = (state: GameState | null) => {
  bootstrapStateStore.current = state;
  bootstrapApplied = false;
};

describe('GameCanvas', () => {
  beforeEach(() => {
    bootstrapStateStore.current = null;
    bootstrapApplied = false;
    fuelControlsState.isInfiltrator = false;
    handleFuelAction.mockReset();
    movementHandlers.handleCanvasClick.mockReset();
    movementHandlers.handleMouseMove.mockReset();
    movementHandlers.cursorRef.current = null;
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve(''), json: () => Promise.resolve({}) })) as unknown as typeof fetch;
    window.alert = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the match header and vote button', () => {
    renderComponent();
    expect(screen.getByText('Isla — Partida MATCH-999')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar votación/i })).toBeEnabled();
  });

  it('shows the vote modal when the game state reports an active vote', async () => {
    const voteOptions: Avatar[] = [
      { id: 2, type: 'npc', ownerUsername: null, x: 1, y: 1 },
      { id: 3, type: 'npc', ownerUsername: null, x: -1, y: 1 },
    ];
    flushBootstrap(buildGameState({
      votingActive: true,
      voteOptions,
      voteEndsAtEpochMs: Date.now() + 15_000,
    }));

    renderComponent();

    expect(await screen.findByText(/elige un npc para expulsar/i)).toBeInTheDocument();
    const voteButtons = screen.getAllByRole('button', { name: /votar/i });
    expect(voteButtons).toHaveLength(voteOptions.length);
  });

  it('sends a vote action to the backend when selecting a player', async () => {
    const voteOptions: Avatar[] = [
      { id: 2, type: 'npc', ownerUsername: null, x: 1, y: 1 },
    ];
    flushBootstrap(buildGameState({
      votingActive: true,
      voteOptions,
      voteEndsAtEpochMs: Date.now() + 10_000,
    }));

    const user = userEvent.setup();
    renderComponent({ matchCode: 'MATCH-VOTE' });

    const voteButton = await screen.findByRole('button', { name: /votar/i });
    await user.click(voteButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/match/MATCH-VOTE/vote'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('requests a manual vote when clicking the start vote button', async () => {
    const user = userEvent.setup();
    renderComponent({ matchCode: 'MATCH-START' });

    await user.click(screen.getByRole('button', { name: /iniciar votación/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/match/MATCH-START/startVote'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('renders the vote result modal when the server shares the outcome', async () => {
    const result: VoteResultPayload = {
      counts: { 2: 3 },
      expelledId: 2,
      expelledType: 'npc',
      message: 'NPC-2 fue expulsado',
      abstentions: 1,
      publishedAtEpochMs: Date.now(),
    };
    flushBootstrap(buildGameState({
      lastVoteResult: result,
      lastVoteResultEpochMs: result.publishedAtEpochMs,
    }));

    renderComponent();

    expect(await screen.findByText(/resultados de la votación/i)).toBeInTheDocument();
    expect(screen.getByText('NPC-2 fue expulsado')).toBeInTheDocument();
  });
});
