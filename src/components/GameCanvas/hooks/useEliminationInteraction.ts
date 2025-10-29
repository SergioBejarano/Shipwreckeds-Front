import { useCallback } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import type { Avatar, GameState } from '../../../utils/GameCanvas/types';

const TARGET_PIXEL_RADIUS = 32;

export type EliminationInteractionParams = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  gameState: GameState | null;
  backendBase: string;
  matchCode: string;
  currentUser: string;
  isInfiltratorRef: MutableRefObject<boolean>;
  getMyAvatar: () => Avatar | undefined;
  handleCanvasClick: (event: MouseEvent) => void;
};

export function useEliminationInteraction({
  canvasRef,
  gameState,
  backendBase,
  matchCode,
  currentUser,
  isInfiltratorRef,
  getMyAvatar,
  handleCanvasClick,
}: EliminationInteractionParams): {
  handleEliminationClick: (event: MouseEvent) => void;
} {
  const attemptElimination = useCallback(async (targetId: number) => {
    try {
      const res = await fetch(`${backendBase}/api/match/${matchCode}/eliminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, targetId }),
      });

      if (!res.ok) {
        const txt = await res.text();
        alert('No se pudo eliminar: ' + txt);
      }
    } catch (error) {
      // We only surface the error through the UI alert to avoid spamming the console.
    }
  }, [backendBase, currentUser, matchCode]);

  const handleEliminationClick = useCallback((event: MouseEvent) => {
    const canvas = canvasRef.current;

    if (!canvas || !isInfiltratorRef.current || !gameState) {
      handleCanvasClick(event);
      return;
    }

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
      return pixelDist <= TARGET_PIXEL_RADIUS;
    });

    if (!target) {
      handleCanvasClick(event);
      return;
    }

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
  }, [attemptElimination, canvasRef, currentUser, gameState, getMyAvatar, handleCanvasClick, isInfiltratorRef]);

  return { handleEliminationClick };
}
