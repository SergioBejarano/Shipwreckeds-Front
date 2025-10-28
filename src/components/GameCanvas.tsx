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

const BACKEND_BASE = 'http://localhost:8080';

type VoteResultPayload = { counts: Record<number, number>; expelledId?: number | null; expelledType?: string; message?: string };

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
    npcAliasCounterRef.current = 0;
  }, [matchCode]);
  const isInfiltratorRef = useRef<boolean>(false);
  const completionShownRef = useRef<boolean>(false);
  const myAliveRef = useRef<boolean | null>(null);
  const [fuelActionPending, setFuelActionPending] = useState(false);
  const [eliminationMessage, setEliminationMessage] = useState<string | null>(null);
  const eliminationRedirectRef = useRef<number | null>(null);

  // NUEVO estado para el mensaje de victoria
  const [resultModalOpen, setResultModalOpen] = useState(false);

  useInitialMatchBootstrap(matchCode, currentUser, setGameState, myAvatarIdRef);
  useNpcAliasRegistry(gameState, npcNameMapRef, npcAliasCounterRef);
  useInfiltratorTracking(gameState, currentUser, myAvatarIdRef, isInfiltratorRef);
  useCompletionNotifier(gameState, completionShownRef);
  useEliminationWatcher(gameState, currentUser, myAvatarIdRef, myAliveRef, setEliminationMessage);
  useEliminationRedirect(eliminationMessage, eliminationRedirectRef, onExitToMenu);

  const fuelPercentage = Math.max(0, Math.min(100, gameState?.fuelPercentage ?? 0));
  const gameStatus = (gameState?.status ?? '').toUpperCase();
  const isGameFinished = gameStatus === 'FINISHED';
  const fuelWindowOpen = !!gameState?.fuelWindowOpen;
  const fuelWindowSecondsRemaining = gameState?.fuelWindowSecondsRemaining ?? 0;
  const fuelWindowMessage = fuelWindowOpen ? 'Tanque de gasolina disponible.' : 'Tanque de gasolina bloqueado.';

  // STOMP client + subscriptions (moved to hook)
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

  // preload barco image
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

  const attemptElimination = useCallback(async (targetId: number) => {
    try {
      const res = await fetch(`${BACKEND_BASE}/api/match/${matchCode}/eliminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, targetId })
      });
      if (!res.ok) {
        const txt = await res.text();
        alert('No se pudo eliminar: ' + txt);
      }
    } catch (e) {
      // ignore network errors for now
    }
  }, [matchCode, currentUser]);

  const handleEliminationClick = useCallback((event: MouseEvent) => {
    const canvas = canvasRef.current;
    if (canvas && isInfiltratorRef.current && gameState) {
      const rect = canvas.getBoundingClientRect();
      const island = gameState.island || { cx: 0, cy: 0, radius: 100 };
      const width = rect.width;
      const height = rect.height;
      const pixelIslandRadius = Math.min(width, height) * 0.36;
      const scale = island.radius > 0 ? pixelIslandRadius / island.radius : pixelIslandRadius / 100;
      const centerX = width / 2;
      const centerY = height / 2;
      const clickX = event.offsetX;
      const clickY = event.offsetY;
      const target = gameState.avatars.find((avatar: Avatar) => {
        if (avatar.type !== 'human') return false;
        if (avatar.isAlive === false) return false;
        if (avatar.ownerUsername === currentUser) return false;
        const avatarPx = centerX + avatar.x * scale;
        const avatarPy = centerY - avatar.y * scale;
        const pixelDist = Math.hypot(avatarPx - clickX, avatarPy - clickY);
        return pixelDist <= 32;
      });
      if (target) {
        event.preventDefault();
        event.stopPropagation();
        const me = getMyAvatar();
        if (me) {
          const distWorld = Math.hypot(me.x - target.x, me.y - target.y);
          if (distWorld > 20) {
            alert('Debes acercarte más para eliminar.');
            return;
          }
        }
        attemptElimination(target.id);
        return;
      }
    }
    handleCanvasClick(event);
  }, [attemptElimination, currentUser, gameState, handleCanvasClick, getMyAvatar]);

  const handleFuelAction = useCallback(async (action: 'FILL' | 'SABOTAGE') => {
    if (!gameState || isGameFinished) return;
    if (!fuelWindowOpen) {
      alert('Tanque de gasolina bloqueado. Espera a que esté disponible.');
      return;
    }
    const mine = getMyAvatar();
    const boat = gameState.boat;
    if (!mine || !boat) {
      alert('No es posible interactuar con el barco en este momento.');
      return;
    }
    const dist = Math.hypot(mine.x - boat.x, mine.y - boat.y);
    const radius = boat.interactionRadius ?? 25;
    const requiresProximity = action === 'FILL' || !mine.isInfiltrator;
    if (requiresProximity && dist > radius) {
      alert('Debes acercarte al barco.');
      return;
    }
    setFuelActionPending(true);
    try {
      const res = await fetch(`${BACKEND_BASE}/api/match/${matchCode}/fuel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, action })
      });
      if (!res.ok) {
        const txt = await res.text();
        alert('No se pudo actualizar el combustible: ' + txt);
      }
    } catch (e) {
      console.error(e);
      alert('Error al interactuar con el combustible.');
    } finally {
      setFuelActionPending(false);
    }
  }, [currentUser, fuelWindowOpen, gameState, getMyAvatar, isGameFinished, matchCode]);

  const myAvatar = getMyAvatar();
  const boatInfo = gameState?.boat;
  const interactionRadius = boatInfo?.interactionRadius ?? 25;
  const isNearBoat = !!(myAvatar && boatInfo && Math.hypot(myAvatar.x - boatInfo.x, myAvatar.y - boatInfo.y) <= interactionRadius);
  const isInfiltrator = !!(myAvatar && myAvatar.isInfiltrator);
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

  // ✅ NUEVO: abrir el modal cuando llega winnerMessage
  useEffect(() => {
    if (gameState?.winnerMessage && !resultModalOpen) {
      setResultModalOpen(true);
    }
  }, [gameState, resultModalOpen]);

  return (
    <div className="game-container card">
      {/* Winner modal */}
      {resultModalOpen && gameState?.winnerMessage && (
        <div className="result-overlay" role="dialog" aria-modal="true">
          <div className="result-card animate-fadeIn">
            <div className="result-anim">
              <h2 className="result-title">{gameState.winnerMessage}</h2>
            </div>
            <p className="result-sub">¡Partida finalizada!</p>
            <div style={{ marginTop: 14 }}>
              <button
                className="button"
                onClick={() => {
                  setResultModalOpen(false);
                  onExitToMenu();
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elimination overlay */}
      {eliminationMessage && (
        <div className="elimination-overlay">
          <div className="elimination-overlay__card">
            <h2>Has sido eliminado</h2>
            <p>{eliminationMessage}</p>
            <button
              type="button"
              className="elimination-overlay__button"
              onClick={() => {
                setEliminationMessage(null);
                onExitToMenu();
              }}
            >
              Volver al lobby
            </button>
          </div>
        </div>
      )}

      <div className="header">
        <div className="title">Isla — Partida {matchCode}</div>
        <div className="small-muted">{connected ? "Conectado al servidor" : "Conectando..."}</div>
      </div>

      <div className="fuel-panel">
        <div className="fuel-progress">
          <div className="fuel-progress__fill" style={{ width: `${fuelPercentage}%` }} />
        </div>
        <div className="fuel-meta">
          <div>
            <span>
              Combustible del barco: {fuelPercentage.toFixed(0)}%
              {isGameFinished ? ' — Partida finalizada' : ''}
            </span>
            <div className={`fuel-window${fuelWindowOpen ? ' available' : ' locked'}`}>
              {fuelWindowMessage}
              {fuelWindowSecondsRemaining > 0 && (
                <span className="fuel-window__countdown">
                  {fuelWindowOpen ? ' Se bloqueará en ' : ' Disponible en '}
                  {fuelWindowSecondsRemaining}s
                </span>
              )}
            </div>
          </div>
          {((isInfiltrator) || isNearBoat) && !isGameFinished && (
            <button
              className={`fuel-action-button${isInfiltrator ? ' sabotage' : ''}`}
              onClick={() => handleFuelAction(isInfiltrator ? 'SABOTAGE' : 'FILL')}
              disabled={!fuelWindowOpen || fuelActionPending}
              title={fuelWindowOpen ? (isInfiltrator ? undefined : (isNearBoat ? undefined : 'Debes acercarte al barco')) : 'Tanque de gasolina bloqueado temporalmente'}
            >
              {fuelActionPending ? 'Procesando...' : (isInfiltrator ? 'Sabotear' : 'Llenar tanque')}
            </button>
          )}
        </div>
      </div>

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