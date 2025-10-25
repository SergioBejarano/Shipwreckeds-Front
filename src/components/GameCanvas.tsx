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

  // STOMP client + subscriptions (moved to hook)
  useStompClient(matchCode, clientRef, setGameState, setConnected, setVoteOptions, setVoteModalOpen, setVoteResult);

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

  // attach click/mouse handlers to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('click', handleCanvasClick as any);
    canvas.addEventListener('mousemove', handleMouseMove as any);
    canvas.addEventListener('mouseleave', () => { if (cursorRef) cursorRef.current = null; });
    return () => {
      canvas.removeEventListener('click', handleCanvasClick as any);
      canvas.removeEventListener('mousemove', handleMouseMove as any);
    };
  }, [handleCanvasClick, handleMouseMove, cursorRef]);

  // canvas drawing loop (hook)
  useGameLoop({ canvasRef, barcoImgRef, gameState, currentUser, canvasWidth, canvasHeight, connected, getDisplayName, npcNameMapRef });

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

      <canvas ref={canvasRef} />

      {/* Vote button bottom-left */}
      {(() => {
        const isInfiltrator = !!isInfiltratorRef.current;
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
          Controles: WASD / Flechas para moverte; click en el mapa para moverte en esa dirección.
        </small>
      </div>
    </div>
  );
}