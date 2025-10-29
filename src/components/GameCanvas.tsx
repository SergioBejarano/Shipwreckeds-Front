import { useCallback, useRef, useState, useEffect } from 'react';
import '../styles/game.css';
import { useStompClient } from './GameCanvas/useStompClient';
import { useBarcoImage } from './GameCanvas/useBarcoImage';
import { useGameLoop } from '../utils/GameCanvas/useGameLoop';
import { useMovement } from '../utils/GameCanvas/useMovement';
import type { Avatar, GameState } from '../utils/GameCanvas/types';
import VoteModal from './GameCanvas/VoteModal';
import VoteResultModal from './GameCanvas/VoteResultModal';
import { useInitialMatchBootstrap } from './GameCanvas/hooks/useInitialMatchBootstrap';
import { useNpcAliasRegistry } from './GameCanvas/hooks/useNpcAliasRegistry';
import { useInfiltratorTracking } from './GameCanvas/hooks/useInfiltratorTracking';
import { useCompletionNotifier } from './GameCanvas/hooks/useCompletionNotifier';
import { useEliminationWatcher } from './GameCanvas/hooks/useEliminationWatcher';
import { useEliminationRedirect } from './GameCanvas/hooks/useEliminationRedirect';
import { useCanvasEvents } from './GameCanvas/hooks/useCanvasEvents';
import { FuelPanel } from './GameCanvas/FuelPanel';
import { ResultOverlay } from './GameCanvas/ResultOverlay';
import { EliminationOverlay } from './GameCanvas/EliminationOverlay';
import { useFuelControls } from './GameCanvas/hooks/useFuelControls';
import { useEliminationInteraction } from './GameCanvas/hooks/useEliminationInteraction';

const BACKEND_BASE = 'https://shipwreckeds-bhc3cad8bkh7bzgy.eastus-01.azurewebsites.net';

type VoteResultPayload = { counts: Record<number, number>; expelledId?: number | null; expelledType?: string; message?: string; abstentions?: number };

type Props = {
  matchCode: string;
  currentUser: string;
  canvasWidth?: number;
  canvasHeight?: number;
  onExitToMenu: () => void;
};

export default function GameCanvas({ matchCode, currentUser, canvasWidth = 900, canvasHeight = 600, onExitToMenu }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barcoImgRef = useRef<HTMLImageElement | null>(null);
  const clientRef = useRef<any | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);

  // voting UI state
  const [voteModalOpen, setVoteModalOpen] = useState(false);
  const [voteOptions, setVoteOptions] = useState<Avatar[]>([]);
  const [voteDuration, setVoteDuration] = useState<number>(20);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteResult, setVoteResult] = useState<VoteResultPayload | null>(null);
  const myAvatarIdRef = useRef<number | null>(null);
  const npcNameMapRef = useRef<Record<number, string>>({});
  const npcAliasCounterRef = useRef<number>(100000);
  useEffect(() => {
    npcNameMapRef.current = {};
    npcAliasCounterRef.current = 100000;
  }, [matchCode]);
  const isInfiltratorRef = useRef<boolean>(false);
  const completionShownRef = useRef<boolean>(false);
  const myAliveRef = useRef<boolean | null>(null);
  const [eliminationMessage, setEliminationMessage] = useState<string | null>(null);
  const eliminationRedirectRef = useRef<number | null>(null);

  const [resultModalOpen, setResultModalOpen] = useState(false);

  useInitialMatchBootstrap(matchCode, currentUser, setGameState, myAvatarIdRef);
  useNpcAliasRegistry(gameState, npcNameMapRef, npcAliasCounterRef);
  useInfiltratorTracking(gameState, currentUser, myAvatarIdRef, isInfiltratorRef);
  useCompletionNotifier(gameState, completionShownRef);
  useEliminationWatcher(gameState, currentUser, myAvatarIdRef, myAliveRef, setEliminationMessage);
  useEliminationRedirect(eliminationMessage, eliminationRedirectRef, onExitToMenu);

  const handleVoteStart = useCallback((payload: { options?: Avatar[]; durationSeconds?: number } | null) => {
    const incomingOptions = payload && Array.isArray(payload.options) ? payload.options : [];
    setVoteOptions(incomingOptions);
    const duration = payload && typeof payload.durationSeconds !== 'undefined'
      ? Number(payload.durationSeconds)
      : NaN;
    setVoteDuration(Number.isFinite(duration) && duration > 0 ? duration : 20);
    setHasVoted(false);
    setVoteResult(null);
    setVoteModalOpen(true);
  }, [setVoteModalOpen, setHasVoted, setVoteOptions, setVoteDuration, setVoteResult]);

  useStompClient(matchCode, clientRef as any, setGameState, setConnected, setVoteOptions, setVoteModalOpen, setVoteResult, handleVoteStart);

  useBarcoImage(barcoImgRef);

  const getDisplayName = useCallback((a: Avatar) => {
    if (a.type === 'npc') {
      return npcNameMapRef.current[a.id] || a.displayName || `NPC-${npcAliasCounterRef.current}`;
    }
    if (a.ownerUsername) return a.ownerUsername;
    if (a.displayName) return a.displayName;
    return `Jugador-${a.id}`;
  }, []);

  const getMyAvatar = useCallback((): Avatar | undefined => {
    if (!gameState) return undefined;
    const byOwner = gameState.avatars.find((a: Avatar) => a.ownerUsername === currentUser && a.type === 'human');
    if (byOwner) return byOwner;
    if (myAvatarIdRef.current != null) return gameState.avatars.find((a: Avatar) => a.id === myAvatarIdRef.current);
    return undefined;
  }, [gameState, currentUser]);

  // movement hook: handles keyboard sending and provides click/mouse handlers
  const { handleCanvasClick, handleMouseMove, cursorRef } = useMovement({ clientRef, matchCode, currentUser, getMyAvatar, gameState });

  // canvas drawing loop (hook)
  useGameLoop({ canvasRef, barcoImgRef, gameState, currentUser, canvasWidth, canvasHeight, connected, getDisplayName, npcNameMapRef });

  const {
    fuelPercentage,
    fuelWindowOpen,
    fuelWindowSecondsRemaining,
    fuelWindowMessage,
    isGameFinished,
    isNearBoat,
    isInfiltrator,
    fuelActionPending,
    handleFuelAction,
  } = useFuelControls({
    gameState,
    backendBase: BACKEND_BASE,
    matchCode,
    currentUser,
    getMyAvatar,
  });

  const { handleEliminationClick } = useEliminationInteraction({
    canvasRef,
    gameState,
    backendBase: BACKEND_BASE,
    matchCode,
    currentUser,
    isInfiltratorRef,
    getMyAvatar,
    handleCanvasClick,
  });

  useCanvasEvents(canvasRef, handleEliminationClick, handleMouseMove, cursorRef);

  // vote action passed to VoteModal
  const onVote = useCallback(async (targetId: number) => {
    if (hasVoted) {
      return;
    }
    try {
      const res = await fetch(`${BACKEND_BASE}/api/match/${matchCode}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, targetId }),
      });
      if (res.ok) {
        setHasVoted(true);
        return;
      }
      const txt = await res.text();
      alert('Fallo al votar: ' + txt);
    } catch (e) {
      console.error(e);
      alert('Error al enviar voto');
    }
  }, [currentUser, hasVoted, matchCode]);

  const handleCloseVoteResult = () => {
    if (voteResult?.expelledType === 'human') {
      onExitToMenu();
      return;
    }
    setVoteResult(null);
  };

  useEffect(() => {
    if (voteResult) {
      setVoteModalOpen(false);
    }
  }, [voteResult]);

  useEffect(() => {
    if (gameState?.winnerMessage && !resultModalOpen) {
      setResultModalOpen(true);
    }
  }, [gameState, resultModalOpen]);

  return (
    <div className="game-container card">
      <ResultOverlay
        isOpen={resultModalOpen}
        winnerMessage={gameState?.winnerMessage}
        onConfirm={() => {
          setResultModalOpen(false);
          onExitToMenu();
        }}
      />

      <EliminationOverlay
        message={eliminationMessage}
        onReturnToLobby={() => {
          setEliminationMessage(null);
          onExitToMenu();
        }}
      />

      <div className="header">
        <div className="title">Isla — Partida {matchCode}</div>
        <div className="small-muted">{connected ? "Conectado al servidor" : "Conectando..."}</div>
      </div>

      <FuelPanel
        fuelPercentage={fuelPercentage}
        fuelWindowMessage={fuelWindowMessage}
        fuelWindowOpen={fuelWindowOpen}
        fuelWindowSecondsRemaining={fuelWindowSecondsRemaining}
        isGameFinished={isGameFinished}
        isInfiltrator={isInfiltrator}
        isNearBoat={isNearBoat}
        fuelActionPending={fuelActionPending}
        onFuelAction={handleFuelAction}
      />

      <canvas ref={canvasRef} />

      {/* Vote button */}
      <button
        className="vote-button"
        disabled={isInfiltrator}
        title={isInfiltrator ? 'El infiltrado no puede iniciar votaciones' : 'Iniciar votación'}
        onClick={async () => {
          if (isInfiltratorRef.current) return;
          try {
            const res = await fetch(`${BACKEND_BASE}/api/match/${matchCode}/startVote?username=${encodeURIComponent(currentUser)}`, { method: 'POST' });
            if (!res.ok) {
              const text = await res.text();
              alert('No se pudo iniciar la votación: ' + text);
            }
          } catch (e) {
            console.error(e);
            alert('Error iniciando votación');
          }
        }}
      >
        Iniciar votación
      </button>

      {/* Voting modals */}
      {voteModalOpen && (
        <VoteModal
          options={voteOptions}
          hasVoted={hasVoted}
          onVote={onVote}
          onClose={() => setVoteModalOpen(false)}
          getDisplayName={getDisplayName}
          isInfiltrator={isInfiltrator}
          durationSeconds={voteDuration}
        />
      )}
      {voteResult && (
        <VoteResultModal
          result={voteResult}
          gameState={gameState}
          npcNameMap={npcNameMapRef.current}
          onClose={handleCloseVoteResult}
        />
      )}

      <div style={{ marginTop: 8 }}>
        <small className="small-muted">
          Controles: WASD / Flechas para moverte; click en el mapa para moverte en esa dirección. Acércate al barco
          para llenar o sabotear el tanque.
        </small>
      </div>
    </div>
  );
}