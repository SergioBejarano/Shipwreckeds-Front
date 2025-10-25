// src/components/GameCanvas.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { getMatch } from '../utils/api';
import '../styles/game.css';
import { useStompClient } from './GameCanvas/useStompClient';
import { useBarcoImage } from './GameCanvas/useBarcoImage';
import { useGameLoop } from '../utils/GameCanvas/useGameLoop';
import { useMovement } from '../utils/GameCanvas/useMovement';
import type { Avatar, GameState } from '../utils/GameCanvas/types';
import VoteModal from './GameCanvas/VoteModal';
import VoteResultModal from './GameCanvas/VoteResultModal';

const BACKEND_BASE = 'http://localhost:8080';

type VoteResultPayload = { counts: Record<number, number>; expelledId?: number | null; expelledType?: string; message?: string };

type Props = {
  matchCode: string;
  currentUser: string;
  canvasWidth?: number;
  canvasHeight?: number;
};

export default function GameCanvas({ matchCode, currentUser, canvasWidth = 900, canvasHeight = 600 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barcoImgRef = useRef<HTMLImageElement | null>(null);
  const clientRef = useRef<any | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);

  // voting UI state
  const [voteModalOpen, setVoteModalOpen] = useState(false);
  const [voteOptions, setVoteOptions] = useState<Avatar[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteResult, setVoteResult] = useState<VoteResultPayload | null>(null);
  const myAvatarIdRef = useRef<number | null>(null);
  const npcNameMapRef = useRef<Record<number, string>>({});
  const isInfiltratorRef = useRef<boolean>(false);
  const completionShownRef = useRef<boolean>(false);
  const [fuelActionPending, setFuelActionPending] = useState(false);

  const fuelPercentage = Math.max(0, Math.min(100, gameState?.fuelPercentage ?? 0));
  const gameStatus = (gameState?.status ?? '').toUpperCase();
  const isGameFinished = gameStatus === 'FINISHED';

  // STOMP client + subscriptions (moved to hook)
  useStompClient(matchCode, clientRef as any, setGameState, setConnected, setVoteOptions, setVoteModalOpen, setVoteResult);

  // preload barco image
  useBarcoImage(barcoImgRef);

  // fetch initial match state in case we missed server broadcast
  useEffect(() => {
    let mounted = true;
    async function fetchInitial() {
      try {
        const m = await getMatch(matchCode);
        if (!mounted || !m) return;
        if (m.status === 'STARTED') {
          const island = { cx: 0, cy: 0, radius: 100 };
          const avatars: Avatar[] = [];
          if (Array.isArray(m.players)) {
            for (const p of m.players) {
              const pos = p.position || { x: 0, y: 0 };
              if (p.isInfiltrator) {
                avatars.push({ id: p.id, type: 'npc', ownerUsername: null, x: pos.x, y: pos.y, isInfiltrator: true, isAlive: p.isAlive });
              } else {
                avatars.push({ id: p.id, type: 'human', ownerUsername: p.username, x: pos.x, y: pos.y, isInfiltrator: !!p.isInfiltrator, isAlive: p.isAlive });
              }
              if (p.username === currentUser) myAvatarIdRef.current = p.id;
            }
          }
          if (Array.isArray(m.npcs)) {
            for (const n of m.npcs) {
              const pos = n.position || { x: 0, y: 0 };
              avatars.push({ id: n.id, type: 'npc', ownerUsername: null, x: pos.x, y: pos.y, isInfiltrator: !!n.infiltrator, isAlive: n.active !== false });
            }
          }
          setGameState({ code: matchCode, timestamp: Date.now(), island, avatars });
        }
      } catch (e) {
        // ignore
      }
    }
    fetchInitial();
    return () => { mounted = false; };
  }, [matchCode, currentUser]);

  // assign random aliases to NPCs per-session
  useEffect(() => {
    if (!gameState) return;
    const map = npcNameMapRef.current;
    for (const a of gameState.avatars) {
      if (a.type === 'npc' && !map[a.id]) {
        const rand = Math.floor(Math.random() * 9000) + 1000;
        map[a.id] = `NPC-${rand}`;
      }
    }
  }, [gameState]);

  const getDisplayName = useCallback((a: Avatar) => {
    if (a.displayName) return a.displayName;
    if (a.ownerUsername) return a.ownerUsername;
    return npcNameMapRef.current[a.id] || `NPC-${a.id}`;
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

  // keep local infiltrator flag up-to-date when we get GameState
  useEffect(() => {
    if (!gameState) { isInfiltratorRef.current = false; return; }
    const me = gameState.avatars.find((a: Avatar) => a.ownerUsername === currentUser && a.type === 'human')
      || (myAvatarIdRef.current != null ? gameState.avatars.find((a: Avatar) => a.id === myAvatarIdRef.current) : undefined);
    isInfiltratorRef.current = !!(me && me.isInfiltrator);
  }, [gameState, currentUser]);

  useEffect(() => {
    if (!gameState) { completionShownRef.current = false; return; }
    const status = (gameState.status ?? '').toUpperCase();
    const fuel = gameState.fuelPercentage ?? 0;
    if (status === 'FINISHED' && fuel >= 100) {
      if (!completionShownRef.current) {
        completionShownRef.current = true;
        alert('Partida terminada, ganaron los naufragos.');
      }
    } else if (status !== 'FINISHED') {
      completionShownRef.current = false;
    }
  }, [gameState]);

  // show victim alert if our own avatar transitions from alive -> dead
  const myAliveRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!gameState) return;
    const me = gameState.avatars.find((a: Avatar) => a.ownerUsername === currentUser && a.type === 'human')
      || (myAvatarIdRef.current != null ? gameState.avatars.find((a: Avatar) => a.id === myAvatarIdRef.current) : undefined);
    if (!me) return;
    const nowAlive = me.isAlive !== false;
    const prev = myAliveRef.current;
    if (prev === null) {
      myAliveRef.current = nowAlive;
      return;
    }
    if (prev && !nowAlive) {
      alert('Has sido eliminado.');
    }
    myAliveRef.current = nowAlive;
  }, [gameState, currentUser]);

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
    const mine = getMyAvatar();
    const boat = gameState.boat;
    if (!mine || !boat) {
      alert('No es posible interactuar con el barco en este momento.');
      return;
    }
    const dist = Math.hypot(mine.x - boat.x, mine.y - boat.y);
    const radius = boat.interactionRadius ?? 25;
    if (dist > radius) {
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
  }, [currentUser, gameState, getMyAvatar, isGameFinished, matchCode]);

  const myAvatar = getMyAvatar();
  const boatInfo = gameState?.boat;
  const interactionRadius = boatInfo?.interactionRadius ?? 25;
  const isNearBoat = !!(myAvatar && boatInfo && Math.hypot(myAvatar.x - boatInfo.x, myAvatar.y - boatInfo.y) <= interactionRadius);
  const isInfiltrator = !!(myAvatar && myAvatar.isInfiltrator);

  // attach click/mouse handlers to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('click', handleEliminationClick as any);
    canvas.addEventListener('mousemove', handleMouseMove as any);
    canvas.addEventListener('mouseleave', () => { if (cursorRef) cursorRef.current = null; });
    return () => {
      canvas.removeEventListener('click', handleEliminationClick as any);
      canvas.removeEventListener('mousemove', handleMouseMove as any);
    };
  }, [handleEliminationClick, handleMouseMove, cursorRef]);

  // vote action passed to VoteModal
  const onVote = async (targetId: number) => {
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
  };

  const handleCloseVoteResult = () => {
    if (voteResult?.expelledType === 'human') {
      window.location.href = '/';
      return;
    }
    setVoteResult(null);
  };

  return (
    <div className="game-container card">
      <div className="header">
        <div className="title">Isla — Partida {matchCode}</div>
        <div className="small-muted">{connected ? "Conectado al servidor" : "Conectando..."}</div>
      </div>

      <div className="fuel-panel">
        <div className="fuel-progress">
          <div className="fuel-progress__fill" style={{ width: `${fuelPercentage}%` }} />
        </div>
        <div className="fuel-meta">
          <span>
            Combustible del barco: {fuelPercentage.toFixed(0)}%
            {isGameFinished ? ' — Partida finalizada' : ''}
          </span>
          {isNearBoat && !isGameFinished && (
            <button
              className={`fuel-action-button${isInfiltrator ? ' sabotage' : ''}`}
              onClick={() => handleFuelAction(isInfiltrator ? 'SABOTAGE' : 'FILL')}
            >
              {fuelActionPending ? 'Procesando...' : (isInfiltrator ? 'Sabotear' : 'Llenar tanque')}
            </button>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} />

      {/* Vote button bottom-left */}
      {(() => {
        return (
          <button
            className="vote-button"
            disabled={isInfiltrator}
            title={isInfiltrator ? 'El infiltrado no puede iniciar votaciones' : 'Iniciar votación'}
            onClick={async () => {
              if (isInfiltratorRef.current) return; // extra guard
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
        );
      })()}

      {/* Voting modal (extracted) */}
      {voteModalOpen && (
        <VoteModal
          options={voteOptions}
          hasVoted={hasVoted}
          onVote={onVote}
          onClose={() => setVoteModalOpen(false)}
          getDisplayName={getDisplayName}
        />
      )}

      {/* Vote result modal (extracted) */}
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